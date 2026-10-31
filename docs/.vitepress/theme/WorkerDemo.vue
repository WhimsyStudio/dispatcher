<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Provider } from '../../../src/lib/dispatcher';
import DemoWorker from './demo.worker?worker';

type AppToWorker = {
  double: (value: number) => number;
};

type WorkerToApp = {
  doubled: (value: number) => void;
};

type DemoProvider = ReturnType<
  typeof Provider.create<WorkerToApp, AppToWorker>
>;

const value = ref(21);
const result = ref<number>();
const error = ref('');
const loading = ref(false);
let provider: DemoProvider | undefined;

onMounted(() => {
  provider = Provider.create<WorkerToApp, AppToWorker>(new DemoWorker());
});

onUnmounted(() => {
  provider?.terminate();
});

async function doubleValue() {
  if (!provider) return;

  loading.value = true;
  result.value = undefined;
  error.value = '';

  try {
    result.value = await provider.commit('double', value.value).future;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="worker-demo">
    <label>
      Number
      <input v-model.number="value" type="number" />
    </label>
    <button type="button" :disabled="loading" @click="doubleValue">
      {{ loading ? 'Working…' : 'Double it in a worker' }}
    </button>
    <p v-if="result !== undefined" role="status">Result: {{ result }}</p>
    <p v-if="error" role="alert">Error: {{ error }}</p>
  </div>
</template>

<style scoped>
.worker-demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
}

input {
  width: 110px;
  padding: 6px 8px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

button {
  padding: 7px 12px;
  color: var(--vp-button-brand-text);
  background: var(--vp-button-brand-bg);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}

p {
  flex-basis: 100%;
  margin: 0;
}
</style>
