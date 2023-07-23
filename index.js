import axios from 'axios';
import { promisify } from 'util';
import FormData from 'form-data';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { EdenClient } from '@edenlabs/eden-sdk';
import { Configuration, OpenAIApi } from "openai";
import dotenv from 'dotenv';
dotenv.config();


const EDEN_API_KEY = process.env.EDEN_API_KEY;
const EDEN_API_SECRET = process.env.EDEN_API_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const ELEVENLABS_API_TOKEN = process.env.ELEVENLABS_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const eden = new EdenClient({
  apiKey: process.env.EDEN_API_KEY,
  apiSecret: process.env.EDEN_API_SECRET
});

const openai = new OpenAIApi(new Configuration({
  apiKey: OPENAI_API_KEY
}));

const client = new MongoClient(MONGO_URI);  


const uploadFile = async (filePath) => {
  const readFileAsync = promisify(fs.readFile);
  const media = await readFileAsync(filePath);
  const form = new FormData();
  form.append('media', media);
  const authHeader = {
    "x-api-key": EDEN_API_KEY,
    "x-api-secret": EDEN_API_SECRET,
    'Content-Type': 'multipart/form-data',
  };
  const response = await axios.post(
    `https://api.eden.art/media/upload`,
    form,
    { headers: { ...authHeader, ...form.getHeaders() } }
  );
  return response.data;
}

const pollTask = async (taskId) => {
  const results = await eden.tasks.get({taskId});
  const task = results.task;
  if (task.status === 'completed') {
    return task;
  } else if (task.status === 'failed') {
    throw new Error(task.error);
  } else {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return pollTask(taskId);
  }
}

const textToSpeech = async (inputText, voiceId) => {
  const randomId = Math.floor(Math.random() * 1000000);
  const fileName = 'audio_' + randomId + '.mp3';
  const speechDetails = await axios.request({
    method: 'POST',
    url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    headers: {
      accept: 'audio/mpeg',
      'content-type': 'application/json',
      'xi-api-key': `${ELEVENLABS_API_TOKEN}`,
    },
    data: {
      text: inputText,
    },
    responseType: 'arraybuffer'
  });
  fs.writeFileSync(fileName, speechDetails.data);
  return fileName;
};

const generateMonologue = async (character, prompt) => {

  // generate monologue
  const chatRequest = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        "role": "system",
        "content": character.manifest
      },{
        "role": "user", 
        "content": prompt
      }
    ],
    temperature: 1,
    max_tokens: 300,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };
  const response = await openai.createChatCompletion(chatRequest);
  const answer = response.data.choices[0].message.content;

  // generate tts
  const localFile = await textToSpeech(answer, character.voiceId);
  const edenFile = await uploadFile(localFile);
  fs.unlinkSync(localFile);

  // generate face image
  const face_config = {
    text_input: character.description,
    init_image_data: character.init_image,
    init_image_strength: 0.2,
    width: 576,
    height: 832
  }
  const face_result = await eden.tasks.create({
    generatorName: "create", 
    config: face_config
  });
  const taskResult = await pollTask(face_result.taskId);
  const face_image = taskResult.output.files[0];

  // generate wav2lip
  const w2l_config = {
    face_url: face_image,
    speech_url: edenFile.url,
    gfpgan: false,
    gfpgan_upscale: 2
  }
  const w2l_result = await eden.tasks.create({
    generatorName: "wav2lip", 
    config: w2l_config
  });
  const w2lResult = await pollTask(w2l_result.taskId);
  const outputFile = w2lResult.output.files[0];

  console.log("finished job");
  console.log(w2lResult);

  return {answer, outputFile};
}

const main = async () => {
  await client.connect();
  const characters = client.db('eden-dev').collection('characters');
  const scenarios = client.db('eden-dev').collection('scenarios');
  try {
    while (true) {
      const pendingScenarios = await scenarios.find({status: "pending"}).toArray();
      for (const scenario of pendingScenarios) {
        console.log("=====================================")
        const character = await characters.findOne({_id: scenario.character});
        console.log(scenario);
        const {answer, outputFile} = await generateMonologue(character, scenario.prompt);
        scenarios.updateOne({_id: scenario._id}, {$set: {
          status: "complete", 
          answer: answer,
          output: outputFile
        }});
      }
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}


main();
