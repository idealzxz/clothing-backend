# clothing-backend 本地启动

## 1. 你执行依赖安装

```bash
npm install
```

## 2. 配置环境变量

```bash
copy .env.example .env
```

如使用 PowerShell:

```powershell
Copy-Item .env.example .env
```

## 3. 初始化 Prisma（SQLite 本地文件库）

```bash
npm run prisma:generate
npm run prisma:push
```

## 4. 启动服务

```bash
npm run start:dev
```

服务默认地址: `http://localhost:3000/api`
