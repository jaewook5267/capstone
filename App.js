import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Speech } from 'expo';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [id, setId] = useState(null);
  const [recordingMessageDisplayed, setRecordingMessageDisplayed] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  useEffect(() => {
    Audio.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    if (id !== null) {
      const interval = setInterval(() => {
        sendIdToServer();
      }, 5000);

      setIntervalId(interval);
      return () => clearInterval(interval);
    }
  }, [id]);

  const startRecording = async () => {
    try {
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      if (id !== null) {
        clearInterval(intervalId); // getAnswer 요청의 인터벌을 중지합니다.
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();
      setRecording(newRecording);
    } catch (error) {
      console.log('startRecording error:', error);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setSound({ uri });
      setRecording(null);

      const audioInfo = await FileSystem.getInfoAsync(uri);
      // const fileUriParts = audioInfo.uri.split('/');
      // const fileName = fileUriParts[fileUriParts.length - 1];
      // const fileType = 'audio/wav';

      // 다운로드한 WAV 파일을 로컬에 저장
      // const downloadDest = `${FileSystem.documentDirectory}${fileName}`;
      // await FileSystem.downloadAsync(audioInfo.uri, downloadDest);

      const formData = new FormData();
      formData.append('file', {
        uri: audioInfo.uri,
        file: 'example.wav',
        type: 'audio/wav',
      });
      formData.append('id', id);

      const response = await fetch('http://54.180.85.241:7060/ThirdParty/getSound', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'User-Agent': 'PostmanRuntime/7.31.3',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        body: formData,
      });

      if (response.status === 200) {
        const data = response.data;
        const text = data.data.choices[0].text.trim();
        await convertTextToSpeech(text); // chatgpt의 답변을 음성으로 변환하여 재생하는 함수 호출

      }
    } catch (error) {
      console.log('stopRecording error:', error);
    }
  };

  const playSound = async () => {
    try {
      if (sound && sound.uri) {
        const { sound: soundObject } = await Audio.Sound.createAsync({ uri: sound.uri });
        setSound(soundObject);
        await soundObject.playAsync();
      }
    } catch (error) {
      console.log('playSound error:', error);
    }
  };

  const stopSound = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
      }
    } catch (error) {
      console.log('stopSound error:', error);
    }
  };

  const getIdFromServer = async () => {
    try {
      const response = await axios.get('http://54.180.85.241:7060/user/make');
      const { id } = response.data;
      setId(id);
      Alert.alert(`ID: ${id}\n로블록스에서 ID를 입력해주세요.`);
    } catch (error) {
      console.log('getIdFromServer error:', error);
    }
  };

  const sendIdToServer = async () => {
    try {
      const response = await axios.post('http://54.180.85.241:7060/user/getAnswer', { userid: id });
      const { chatAns } = response.data;

      if (chatAns !== 'N') {
        clearInterval(intervalId);
        if (!recordingMessageDisplayed) {
          Alert.alert('인증이 완료되었습니다.\n녹음 버튼을 눌러 음성 녹음을 시작하세요');
          setRecordingMessageDisplayed(true);
        }
      }
    } catch (error) {
      console.log('sendIdToServer error:', error);
    }
  };

  const convertTextToSpeech = async (text) => {
    try {
      await Speech.speak(text, {
        language: 'en', // 음성 언어 설정 (영어)
        pitch: 1, // 음성 톤 설정 (0.5 ~ 2 사이의 값)
        rate: 1, // 음성 속도 설정 (0 ~ 1 사이의 값)
      });
    } catch (error) {
      console.log('convertTextToSpeech error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Start Recording" onPress={startRecording} disabled={recording !== null} />
      <Button title="Stop Recording" onPress={stopRecording} disabled={recording === null} />
      <Button title="Play Sound" onPress={playSound} disabled={sound === null} />
      <Button title="Stop Sound" onPress={stopSound} disabled={sound === null} />
      <Button title="Get ID" onPress={getIdFromServer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
  },
});