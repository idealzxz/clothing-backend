// =============================================================================
// Docker Compose 部署（Jenkins 节点需能执行 docker / docker compose）
// -----------------------------------------------------------------------------
// 1) Jenkins 若跑在容器里：挂载宿主 Docker 守护进程
//      -v /var/run/docker.sock:/var/run/docker.sock
//    且镜像内安装 Docker CLI（或使用含 docker 的 agent 镜像）。
// 2) 在运行 compose 的目录（检出后的 clothing-backend）放置 .env；
//    生产可由 Jenkins「Secret file」等凭据在流水线中写入 .env（勿提交仓库）。
// 3) SQLite 持久化见 docker-compose.yml 中卷 sqlite_data；DATABASE_URL 需为
//    file:./data/app.db（或你自定义路径且与卷一致）。
// =============================================================================

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    COMPOSE_PROJECT_NAME = 'clothing-backend'
  }

  stages {
    stage('Checkout') {
      steps {
        echo '[clothing-backend] stage: Checkout — 若看不到本行，说明当前构建用的不是仓库里的 Jenkinsfile 或分支不对'
        checkout scm
      }
    }

    stage('Docker Compose: build & up') {
      steps {
        echo '[clothing-backend] stage: Docker Compose — 即将执行 docker compose'
        dir('clothing-backend') {
          sh '''
            set -e
            if ! docker info >/dev/null 2>&1; then
              echo "无法访问 Docker：请为 Jenkins（或 agent）挂载 /var/run/docker.sock 并安装 Docker CLI。" >&2
              exit 1
            fi
            docker compose build
            if [ ! -f .env ]; then
              echo "缺少 clothing-backend/.env。请在部署机该目录放置 .env，或由流水线写入后再 up。" >&2
              exit 1
            fi
            docker compose up -d --remove-orphans
          '''
        }
      }
    }
  }
}
