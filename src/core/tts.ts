export const say = (text: string) => speechSynthesis.speak(new SpeechSynthesisUtterance(text));

const TTS = { say };

export default TTS;
