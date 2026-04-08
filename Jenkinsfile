// =============================================================================
// Docker Compose 部署（Jenkins 节点需能执行 docker / docker compose）
// -----------------------------------------------------------------------------
// 1) Jenkins 若跑在容器里：挂载宿主 Docker 守护进程
//      -v /var/run/docker.sock:/var/run/docker.sock
//    且镜像内安装 Docker CLI（或使用含 docker 的 agent 镜像）。
// 2) 环境变量：使用仓库内 docker.env（可提交），无需在 Jenkins 配置 Secret file。
//    生产请修改 docker.env 中 JWT_SECRET 后再部署，勿长期使用占位符。
// 3) SQLite 持久化见 docker-compose.yml 中卷 sqlite_data；DATABASE_URL 需与卷路径一致。
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
        echo '[clothing-backend] stage: Docker Compose — 使用 docker.env'
        sh '''
          set -e
          if ! docker info >/dev/null 2>&1; then
            echo "无法访问 Docker：请为 Jenkins（或 agent）挂载 /var/run/docker.sock 并安装 Docker CLI。" >&2
            exit 1
          fi
          if [ ! -f docker.env ]; then
            echo "缺少 docker.env（应随仓库提交）。" >&2
            exit 1
          fi
          docker compose --env-file docker.env build
          docker compose --env-file docker.env up -d --remove-orphans
        '''
      }
    }
  }
}
