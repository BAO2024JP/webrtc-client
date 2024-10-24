<script setup>
import { RouterLink } from 'vue-router'
const roomList = [
  { roomId: 'w001', roomName: 'room 001' },
  { roomId: 'w002', roomName: 'room 002' },
  { roomId: 'w003', roomName: 'room 003' },
]
</script>

<template>
  <ul>
    <li v-for="(room, index) in roomList" :key="index">
      <button>
        <RouterLink :to="`/room/${room.roomId}`">{{
          room.roomName
        }}</RouterLink>
      </button>
    </li>
  </ul>
</template>
