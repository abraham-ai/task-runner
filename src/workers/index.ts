import assert from 'assert';
import axios from 'axios';
import fs from 'fs';
import { parentPort } from 'worker_threads';
import { MongoClient } from 'mongodb';
import { EdenClient } from 'eden-sdk';


const MONGO_URI = process.env.MONGO_URI as string;
const ELEVENLABS_API_TOKEN = process.env.ELEVENLABS_API_TOKEN as string;



const textToSpeech = async (inputText: string, voiceId: string) => {
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

const makePrompt = function(character: any, question: string) {
  const prompt = `${character.name}: ${character.bio}    
  You are ${character.name}. You are deep into an interview with me, a journalist and philosopher. For the last several hours, I've asked you various questions about life, love, and the universe. You've given eloquent and witty responses. I ask you: ${question}. You respond:`
  return prompt;
}

parentPort?.on('message', async (params: any) => {

  const client = new MongoClient(MONGO_URI);  
  await client.connect();
  console.log('Connected to the database');

  const eden = new EdenClient();
  eden.loginApi(
    process.env.EDEN_API_KEY as string,
    process.env.EDEN_API_SECRET as string
  );
  
  const characters = client.db('eden-stg').collection('characters');
  const scenarios = client.db('eden-stg').collection('scenarios');

  try {
    while (true) {
      
      const pendingScenarios = await scenarios.find({status: "complete"}).toArray();
      for (const scenario of pendingScenarios) {

        const character = await characters.findOne({_id: scenario.character});
        const prompt = makePrompt(character, scenario.prompt);
        const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // '21m00Tcm4TlvDq8ikWAM';

        const result = await eden.create("complete", {
          prompt: prompt,
          temperature: 0.9,
          max_tokens: 200,
          top_p: 1,
          frequency_penalty: 0.15,
          presence_penalty: 0.1
        });

        const answer = result.task.output.result;
        const localFile = await textToSpeech(answer, voiceId);
        const edenFile = await eden.uploadFile(localFile);
        fs.unlinkSync(localFile);

        scenarios.updateOne({_id: scenario._id}, {$set: {
          status: "complete", 
          answer: answer,
          output: edenFile.url
        }});

      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});
