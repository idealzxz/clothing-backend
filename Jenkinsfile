// 方案一前提：Jenkins 容器需挂载 Docker socket，例如：
//   -v /var/run/docker.sock:/var/run/docker.sock
// 流水线里的 docker / docker compose 由「宿主机」上的 Docker 守护进程执行；
// 业务容器端口映射在宿主机上，浏览器访问：http://<宿主机IP>:<APP_PORT>/api/docs

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
        sh '''
          set -e
          if ! command -v docker >/dev/null 2>&1; then
            echo "ERROR: 未找到 docker 命令。请在 Jenkins 容器中安装 Docker CLI，并挂载 /var/run/docker.sock。"
            exit 1
          fi
          if docker compose version >/dev/null 2>&1; then
            COMPOSE="docker compose"
          elif docker-compose version >/dev/null 2>&1; then
            COMPOSE="docker-compose"
          else
            echo "ERROR: 需要 Docker Compose v2（docker compose）或 v1（docker-compose）。"
            exit 1
          fi

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
        sh '''
          set -e
          if docker compose version >/dev/null 2>&1; then
            COMPOSE="docker compose"
          elif docker-compose version >/dev/null 2>&1; then
            COMPOSE="docker-compose"
          else
            exit 1
          fi
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
