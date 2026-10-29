# Birthday Cake - 拾野

作品集级 Three.js + WebGL 生日蛋糕体验

## Features

- **Three.js r160+** 构建的 3D 场景
- 星空背景与星云 shader
- 单层霓虹流挂蛋糕，颜色动态流动
- 蜡烛火焰 shader 动画 + 蜡泪
- 玻璃穹顶菲涅尔反射
- 粒子系统：星屑与纸屑
- Bloom + Vignette 后处理
- 进场动画序列
- 拖拽/触控轨道控制
- 点击烛火可吹灭/点燃
- 移动端竖屏友好，60fps 目标

## Development

```bash
npm install
npm run dev      # 启动开发服务器
npm run build    # 构建到 dist/
npm run preview  # 预览构建结果
```

## Deployment

```bash
npm run deploy:pages
```

将 `dist/` 内容同步到仓库根目录，供 GitHub Pages 部署。

## Tech Stack

- Vite 5
- Three.js 0.160
- postprocessing (Bloom, Vignette)
- 自定义 GLSL shaders

---

一小片星河，送给今天的你。
