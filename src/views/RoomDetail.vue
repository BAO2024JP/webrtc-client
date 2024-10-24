<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const roomId = route.params.id

const env = {
  ws: 'ws://localhost:8787',
  servers: { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] },
}

const userId = crypto.randomUUID()
let ws
let localStream
const peerConnections = {} // 存储每个用户的 RTCPeerConnection 实例
const remoteStreams = ref({}) // 使用 reactive 存储远程流
const localMedia = ref(null)
const mediaConfig = {
  video: { width: 240, height: 180 },
  audio: true,
}

async function handleMessages(e) {
  const msg = JSON.parse(e.data)
  switch (msg.type) {
    case 'joined':
      await makeCall(msg.from)
      break
    case 'candidate':
      await acceptCandidate(msg.candidate, msg.from)
      break
    case 'offer':
      await answerCall(msg.offer, msg.from)
      break
    case 'answer':
      await startCall(msg.answer, msg.from)
      break
    case 'left':
      endCall(msg.from)
      break
    case 'msg':
      await showMsg(msg.from, msg.msg)
      break
    default:
      break
  }
}

const showMsg = (from, msg) => {
  msgContent.value += `<p><span>${from.substring(0, 6)}:</span>${msg}</p>`
}

const wssend = data => {
  ws.send(JSON.stringify({ ...data, from: userId }))
}

async function startLocalPlayback() {
  localStream = await navigator.mediaDevices.getUserMedia(mediaConfig)
  localMedia.value.srcObject = localStream
}

async function connectToPeer(participantId) {
  const peerConnection = new RTCPeerConnection(env.servers)
  const remoteStream = new MediaStream()

  // 存储连接和流
  peerConnections[participantId] = peerConnection
  remoteStreams.value[participantId] = remoteStream // 存储远程流

  peerConnection.ontrack = e => {
    e.streams[0].getTracks().forEach(t => {
      remoteStream.addTrack(t)
    })
  }

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      wssend({ type: 'candidate', candidate: e.candidate, to: participantId })
    }
  }

  if (!localStream) await startLocalPlayback()

  localStream.getTracks().forEach(t => {
    peerConnection.addTrack(t, localStream)
  })
}

async function makeCall(participantId) {
  await connectToPeer(participantId)
  const offer = await peerConnections[participantId].createOffer()
  await peerConnections[participantId].setLocalDescription(offer)
  wssend({ type: 'offer', offer, to: participantId })
}

async function acceptCandidate(c, participantId) {
  try {
    await peerConnections[participantId].addIceCandidate(c)
  } catch (e) {
    console.log('Error adding ice candidate', e)
  }
}

async function answerCall(offer, participantId) {
  await connectToPeer(participantId)
  await peerConnections[participantId].setRemoteDescription(offer)
  const answer = await peerConnections[participantId].createAnswer()
  await peerConnections[participantId].setLocalDescription(answer)
  wssend({ type: 'answer', answer, to: participantId })
}

async function startCall(answer, participantId) {
  await peerConnections[participantId].setRemoteDescription(answer)
}

function endCall(participantId) {
  const peerConnection = peerConnections[participantId]
  if (peerConnection) {
    peerConnection.close()
    delete peerConnections[participantId]
    delete remoteStreams.value[participantId] // 移除对应的远程流
  }
}

// web msg
const msg = ref('')
const msgContent = ref('')
const sendmsg = () => {
  if (msg.value) {
    wssend({ type: 'msg', msg: msg.value })
    msgContent.value += `<p class="self"><span>${userId.substring(0, 6)}:</span>${msg.value}</p>`
    msg.value = ''
  }
}

onMounted(async () => {
  if (!roomId) return
  ws = new WebSocket(`${env.ws}/${roomId}`)
  ws.onmessage = handleMessages
  console.log(userId)
  ws.onopen = () => wssend({ type: 'joined', from: userId })
  await startLocalPlayback()
})

const test = () => {
  console.log(
    Object.keys(peerConnections).map(id => ({
      id,
      state: peerConnections[id].connectionState,
    })),
  )
}
</script>
<template>
  <div class="room">
    <h1>Room {{ roomId }} — {{ userId.substring(0, 6) }}</h1>
    <div class="input">
      <input type="text" v-model="msg" />
      <button @click="sendmsg">Send</button>
    </div>
    <div class="box">
      <button @click="test">connectionState</button>
      <div class="text" v-html="msgContent"></div>
      <div class="video">
        <div class="video-box">
          <h3>{{ userId.substring(0, 6) }}</h3>
          <video ref="localMedia" autoplay playsinline></video>
        </div>
        <div class="video-box" v-for="(stream, id) in remoteStreams" :key="id">
          <h3>{{ id.substring(0, 6) }}</h3>
          <video
            :ref="`remoteMedia_${id}`"
            autoplay
            playsinline
            :srcObject="stream"
          ></video>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
#app {
  padding: 20px;
}
.box {
}
.input {
  display: flex;
  height: 30px;
  margin-bottom: 50px;
  input {
    flex: 1;
  }
  button {
    width: 100px;
  }
}
.text {
  background: #fff;
  color: #000;
  height: 200px;
  padding: 10px;
  overflow-y: scroll;
  margin-bottom: 20px;
}
.video {
  width: 750px;
  margin-right: 20px;
  .video-box {
    width: 240px;
    margin: 0 10px 10px 0;
    float: left;
  }
}
.self {
  color: #f00;
}
video {
  transform: scaleX(-1);
}
</style>
