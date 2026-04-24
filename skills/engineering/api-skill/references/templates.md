# 模板示例

## 目录

- 基础 CRUD 接口
- 分页列表接口
- 上传下载接口
- 批量操作接口

## 基础 CRUD 接口

```ts
import request from "../request";

export interface Item {
  id: string;
  name: string;
  status: number;
  createTime: string;
}

export interface ItemForm {
  id?: string;
  name: string;
  status: number;
}

export const getItemDetail = (id: string) => request({
  url: `/api/item/${id}`,
  method: "get",
});

export const addItem = (data: ItemForm) => request({
  url: "/api/item",
  method: "post",
  data,
});

export const updateItem = (data: ItemForm) => request({
  url: "/api/item",
  method: "put",
  data,
});

export const deleteItem = (id: string) => request({
  url: `/api/item/${id}`,
  method: "delete",
});
```

## 分页列表接口

```ts
export interface ListParams {
  keyword?: string;
  pageQuery: {
    pageNum: number;
    pageSize: number;
    orderByColumn?: string;
    isAsc?: "asc" | "desc";
  };
}

export const getList = (data: ListParams) => request({
  url: "/api/item/list",
  method: "post",
  data,
});
```

## 上传下载接口

```ts
export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return request({
    url: "/api/upload",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const downloadFile = (id: string) => request({
  url: `/api/download/${id}`,
  method: "get",
  responseType: "blob",
});
```

## 批量操作接口

```ts
export const batchDelete = (ids: string[]) => request({
  url: "/api/item/batch",
  method: "delete",
  data: { ids },
});
```
