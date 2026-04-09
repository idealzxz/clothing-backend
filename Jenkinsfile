// 方案一前提：Jenkins 容器需挂载 Docker socket，例如：
//   -v /var/run/docker.sock:/var/run/docker.sock
// 流水线里的 docker / docker compose 由「宿主机」上的 Docker 守护进程执行；
// 业务容器端口映射在宿主机上，浏览器访问：http://<宿主机IP>:<APP_PORT>/api/docs
//
// 若镜像仅有 docker CLI、无 compose：流水线会尝试把 Compose v2 下载到 ~/.docker/cli-plugins/（需能访问 github.com）。

pipeline {
  agent any

  parameters {
    string(name: 'APP_PORT', defaultValue: '3000', description: '宿主机映射端口（与 docker-compose 中 PORT 一致）')
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    APP_PORT = "${params.APP_PORT ?: '3000'}"
  }

  stages {
    stage('Docker: build & run') {
      steps {
        sh '''#!/bin/sh
          set -e
          if ! command -v docker >/dev/null 2>&1; then
            echo "ERROR: 未找到 docker 命令。请在 Jenkins 容器中安装 Docker CLI，并挂载 /var/run/docker.sock。"
            exit 1
          fi

          ensure_compose() {
            if docker compose version >/dev/null 2>&1; then
              COMPOSE="docker compose"
              return 0
            fi
            if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
              COMPOSE="docker-compose"
              return 0
            fi
            echo "未检测到 Compose，下载 v2 插件到 ${HOME}/.docker/cli-plugins/ ..."
            ARCH=$(uname -m)
            case "$ARCH" in
              x86_64) COMPOSE_ARCH="x86_64" ;;
              aarch64|arm64) COMPOSE_ARCH="aarch64" ;;
              *) echo "ERROR: 不支持的架构: $ARCH"; exit 1 ;;
            esac
            COMPOSE_VER="v2.29.7"
            mkdir -p "${HOME}/.docker/cli-plugins"
            DL="${HOME}/.docker/cli-plugins/docker-compose"
            URL="https://mirror.ghproxy.com/https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-${COMPOSE_ARCH}"
            if command -v curl >/dev/null 2>&1; then
              curl -fSL --retry 3 "$URL" -o "$DL"
            elif command -v wget >/dev/null 2>&1; then
              wget -qO "$DL" "$URL"
            else
              echo "ERROR: 需要 curl 或 wget 以下载 docker compose，或在镜像中 apt 安装 docker-compose-plugin。"
              exit 1
            fi
            chmod +x "$DL"
            if ! docker compose version >/dev/null 2>&1; then
              echo "ERROR: 已安装插件但 docker compose 仍不可用，请检查 Docker CLI 版本。"
              exit 1
            fi
            COMPOSE="docker compose"
          }

          ensure_compose

          if [ ! -f docker.env ]; then
            echo "ERROR: 缺少 docker.env。请提交该文件或在流水线中从 Credentials 写入。"
            exit 1
          fi

          export PORT="${APP_PORT}"
          ${COMPOSE} up -d --build --remove-orphans
        '''
      }
    }

    stage('Smoke: container & HTTP') {
      steps {
        sh '''#!/bin/sh
          set -e
          ensure_compose() {
            if docker compose version >/dev/null 2>&1; then
              COMPOSE="docker compose"
              return 0
            fi
            if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
              COMPOSE="docker-compose"
              return 0
            fi
            ARCH=$(uname -m)
            case "$ARCH" in
              x86_64) COMPOSE_ARCH="x86_64" ;;
              aarch64|arm64) COMPOSE_ARCH="aarch64" ;;
              *) exit 1 ;;
            esac
            COMPOSE_VER="v2.29.7"
            mkdir -p "${HOME}/.docker/cli-plugins"
            DL="${HOME}/.docker/cli-plugins/docker-compose"
            URL="https://mirror.ghproxy.com/https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-${COMPOSE_ARCH}"
            if command -v curl >/dev/null 2>&1; then
              curl -fSL --retry 3 "$URL" -o "$DL"
            else
              wget -qO "$DL" "$URL"
            fi
            chmod +x "$DL"
            COMPOSE="docker compose"
          }
          ensure_compose
          ${COMPOSE} ps
          ${COMPOSE} exec -T api node -e "fetch('http://127.0.0.1:3000/api/docs').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
          echo "Smoke OK。宿主机浏览器打开: http://<宿主机IP>:${APP_PORT}/api/docs"
        '''
      }
    }
  }

  post {
    failure {
      sh 'docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || true'
    }
  }
}
