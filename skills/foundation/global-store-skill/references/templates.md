# 模板示例

## 获取全局 store

```ts
import { useGlobalStoreWithOut } from "@power/runtime-vue3";

const globalStore = useGlobalStoreWithOut();
const token = globalStore.token;
```

## 项目私有领域 store

```ts
export const useMonitorStore = defineStore("monitor", {
  state: () => ({
    currentObjectId: ""
  })
});
```
