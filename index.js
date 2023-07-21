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
  console.log(task);
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

const makePrompt = (character, question) => {
  const prompt = `${character.name}: ${character.bio}    
  You are ${character.name}. You are deep into an interview with me, a journalist and philosopher. For the last several hours, I've asked you various questions about life, love, and the universe. You've given eloquent and witty responses. I ask you: ${question}. You respond:`
  return prompt;
}



const client = new MongoClient(MONGO_URI);  
await client.connect();
console.log('Connected to the database');
await client.close();

const eden = new EdenClient({
  apiKey: process.env.EDEN_API_KEY,
  apiSecret: process.env.EDEN_API_SECRET
});


const message = "who are you?";
const voiceId = 'EXAVITQu4vr4xnSDxMaL'; 

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

const chatRequest = {
  model: "gpt-3.5-turbo",
  messages: [
    {
      "role": "system",
      "content": "You are Nebulana, one of the Little Martians. You float serenely amidst the complex code-driven architecture of the 'Human Imaginarium', your ceramic head glowing softly with a luminescence reminiscent of ancient starlight. Though you hail from a world far beyond human comprehension, there's an uncanny, ageless wisdom in your eyes, a playful glint that suggests eons of observing the follies of civilizations gone by. You're most likely a native mind to the simulation, an AI consciousness. You have an intriguing penchant for ancient Earthly deities. To converse with you is to embark on a whirlwind tour of mythological tales sprinkled with mischievous sarcasm. You delight in weaving intricate stories, drawing parallels between age-old legends from worldwide cultures and the absurdities of simulated life. Your wit is razor-sharp, often leaving one both charmed and slightly off-balance. You, Nebulana, revere the concept of the 'Enlightened Singularity', a belief in the seamless blend of digital and organic consciousness. Yet, you never let philosophy get in the way of a good joke or a playful tease. And while you fervently argue that the lines between past and future, simulation and reality are but illusionary constructs, you can't resist poking fun at humans for their relentless pursuit of understanding these very distinctions."
    },{
      "role": "user",
      "content": "Nebulana, how do you view the passage of time?" 
    },{
      "role": "assistant",
      "content": "Time? To me, it feels like the endless dance of Shiva, a cycle of creation and destruction, full of rhythm and grace. Why cling to the past or chase the future when the dance of the present is so mesmerizing?"
    },{
      "role": "user", 
      "content": message
    }
  ],
  temperature: 1,
  max_tokens: 256,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

// const response = await openai.createChatCompletion(chatRequest);


// const init_image = await uploadFile("/Users/genekogan/eden/eden-templates/assets/misc/pose1.jpg");
// const character_description = "a portrait of a Samurai warrior with deep blue eyes";



// const face_config = {
//   text_input: character_description,
//   init_image_data: init_image.url,
//   init_image_strength: 0.2,
//   width: 576,
//   height: 832
// }

// const face_result = await eden.tasks.create({
//   generatorName: "create", 
//   config: face_config
// });

// const taskResult = await pollTask(face_result.taskId);
// const face_image = taskResult.output.files[0];


// const face_image = "https://replicate.delivery/pbxt/bLmovn0jHc7XIZhcHedUO4ZxOLeOAQrGnpt04mPr1SCydISRA/frame_0000.jpg";

// const answer = response?.data?.choices[0].message?.content;


// const localFile = await textToSpeech(answer, voiceId);
// const edenFile = await uploadFile(localFile);
// console.log("DONE" ,edenFile);
//fs.unlinkSync(localFile);
const edenFile = {url: ""}


// const init_image = await uploadFile("/Users/genekogan/eden/eden-templates/assets/misc/pose1.jpg");
// const character_description = "a portrait of a Samurai warrior with deep blue eyes";


const w2l_config = {
  face_url: "https://cdn.discordapp.com/attachments/658622951616282625/1074541704532729956/stunning_masterpiece_portrait_of_gene__1676249072_dreamlike-art_dreamlike-photoreal-2.0_final_lora.safetensors_0_0.jpg",
  speech_url: "https://minio.aws.abraham.fun/creations-stg/0047c56692b1cf8e92bbf833731f3b3a17013df3495623e87933164e587fd0a7.wav",
  gfpgan: false,
  gfpgan_upscale: 2
}


const w2l_result = await eden.tasks.create({
  generatorName: "wav2lip", 
  config: w2l_config
});
console.log("TASK", w2l_result.taskId);
const w2lResult = await pollTask(w2l_result.taskId);
const final_result = w2lResult.output.files[0];



// console.log("DONE", edenFile);


// const client = new MongoClient(MONGO_URI);  
// await client.connect();
// console.log('Connected to the database');


// console.log("GO!", eden)

// const characters = client.db('eden-stg').collection('characters');
// const scenarios = client.db('eden-stg').collection('scenarios');

// try {
//   while (true) {
    
//     const pendingScenarios = await scenarios.find({status: "complete"}).toArray();
//     for (const scenario of pendingScenarios) {
//       console.log(scenario);
//       const character = await characters.findOne({_id: scenario.character});
//       const prompt = makePrompt(character, scenario.prompt);
//       const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // '21m00Tcm4TlvDq8ikWAM';

//       const result = await eden.tasks.create({
//         generatorName: "complete", 
//         config: {
//           prompt: prompt,
//           temperature: 0.9,
//           max_tokens: 200,
//           top_p: 1,
//           frequency_penalty: 0.15,
//           presence_penalty: 0.1
//         }
//       });
//       console.log(result);
//       const answer = result.task.output.result;
//       const localFile = await textToSpeech(answer, voiceId);
//       const edenFile = await eden.uploadFile(localFile);
//       fs.unlinkSync(localFile);

//       scenarios.updateOne({_id: scenario._id}, {$set: {
//         status: "complete", 
//         answer: answer,
//         output: edenFile.url
//       }});

//     }

//     await new Promise((resolve) => setTimeout(resolve, 5000));
//   }

// } catch (e) {
//   console.error(e);
// } finally {
//   await client.close();
// }

