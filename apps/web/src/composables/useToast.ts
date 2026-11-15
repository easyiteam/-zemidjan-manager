import { ref } from "vue";

const message = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

export function useToast() {
  function show(text: string, duration = 2600) {
    message.value = text;
    clearTimeout(timer);
    timer = setTimeout(() => {
      message.value = null;
    }, duration);
  }
  return { message, show };
}
