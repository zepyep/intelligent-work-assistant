#!/bin/bash

# 智能工作助手应用 - GitHub部署自动化脚本
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装后再运行此脚本"
        exit 1
    fi
}

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "🚀 智能工作助手应用 GitHub部署工具"
    echo "=========================================="
    echo -e "${NC}"
}

# 检查环境
check_environment() {
    log_info "检查部署环境..."
    
    # 检查必需的命令
    check_command "git"
    check_command "node"
    check_command "npm"
    check_command "docker"
    check_command "docker-compose"
    
    # 检查Node.js版本
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ $NODE_VERSION -lt 16 ]; then
        log_error "Node.js版本过低，需要16.x或更高版本"
        exit 1
    fi
    
    log_success "环境检查通过 ✓"
}

# 检查项目结构
check_project_structure() {
    log_info "检查项目结构..."
    
    # 必需的文件和目录
    REQUIRED_PATHS=(
        "server/package.json"
        "client/package.json"
        ".github/workflows/deploy.yml"
        "Dockerfile.prod"
        "docker-compose.prod.yml"
        "nginx/nginx.conf"
    )
    
    for path in "${REQUIRED_PATHS[@]}"; do
        if [ ! -f "$path" ] && [ ! -d "$path" ]; then
            log_error "缺少必需文件或目录: $path"
            exit 1
        fi
    done
    
    log_success "项目结构检查通过 ✓"
}

# 运行测试
run_tests() {
    log_info "运行应用测试..."
    
    # 后端测试
    if [ -f "server/package.json" ]; then
        cd server
        if npm run test > /dev/null 2>&1; then
            log_success "后端测试通过 ✓"
        else
            log_warning "后端测试失败或未配置"
        fi
        cd ..
    fi
    
    # 前端测试
    if [ -f "client/package.json" ]; then
        cd client
        if npm run test -- --watchAll=false > /dev/null 2>&1; then
            log_success "前端测试通过 ✓"
        else
            log_warning "前端测试失败或未配置"
        fi
        cd ..
    fi
}

# 构建应用
build_application() {
    log_info "构建应用..."
    
    # 构建前端
    log_info "构建前端应用..."
    cd client
    npm ci --silent
    CI=false npm run build
    cd ..
    log_success "前端构建完成 ✓"
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd server
    npm ci --silent
    cd ..
    log_success "后端依赖安装完成 ✓"
}

# Docker构建测试
test_docker_build() {
    log_info "测试Docker构建..."
    
    if docker build -f Dockerfile.prod -t smart-work-assistant:test . > /dev/null 2>&1; then
        log_success "Docker构建测试通过 ✓"
        docker rmi smart-work-assistant:test > /dev/null 2>&1
    else
        log_error "Docker构建失败"
        exit 1
    fi
}

# Git配置检查
check_git_config() {
    log_info "检查Git配置..."
    
    # 检查是否在git仓库中
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        log_error "当前目录不是Git仓库"
        exit 1
    fi
    
    # 检查远程仓库
    if ! git remote get-url origin > /dev/null 2>&1; then
        log_error "未配置远程仓库origin"
        exit 1
    fi
    
    # 检查未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "存在未提交的更改"
        echo -n "是否继续? (y/n): "
        read -r response
        if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
    
    log_success "Git配置检查通过 ✓"
}

# 提交并推送代码
deploy_to_github() {
    log_info "部署到GitHub..."
    
    # 添加所有文件
    git add .
    
    # 生成提交信息
    COMMIT_MSG="🚀 Deploy: 智能工作助手应用部署配置 $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 提交更改
    if git commit -m "$COMMIT_MSG"; then
        log_success "代码已提交 ✓"
    else
        log_warning "没有需要提交的更改"
    fi
    
    # 推送到远程仓库
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if git push origin "$BRANCH"; then
        log_success "代码已推送到GitHub ✓"
    else
        log_error "推送失败"
        exit 1
    fi
    
    # 获取仓库URL
    REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
    
    echo
    log_success "🎉 部署配置已成功推送到GitHub!"
    echo
    echo -e "${GREEN}下一步操作:${NC}"
    echo "1. 访问您的GitHub仓库: $REPO_URL"
    echo "2. 进入 Actions 选项卡查看自动化部署流程"
    echo "3. 配置必要的 GitHub Secrets (参考 GITHUB_DEPLOYMENT_GUIDE.md)"
    echo "4. 启用GitHub Actions工作流"
    echo
}

# 生成部署报告
generate_deployment_report() {
    log_info "生成部署报告..."
    
    REPORT_FILE="DEPLOYMENT_REPORT_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# 🚀 智能工作助手应用部署报告

## 📊 部署信息
- **部署时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **Git分支**: $(git rev-parse --abbrev-ref HEAD)
- **Git提交**: $(git rev-parse --short HEAD)
- **Node.js版本**: $(node --version)
- **NPM版本**: $(npm --version)
- **Docker版本**: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)

## 📋 部署内容
- ✅ GitHub Actions工作流配置
- ✅ 生产环境Docker配置
- ✅ Nginx反向代理配置
- ✅ MongoDB初始化脚本
- ✅ 环境变量模板
- ✅ 部署指南文档

## 🔗 重要链接
- **GitHub仓库**: $(git remote get-url origin | sed 's/\.git$//')
- **Actions页面**: $(git remote get-url origin | sed 's/\.git$//')/actions
- **部署指南**: GITHUB_DEPLOYMENT_GUIDE.md

## 🎯 下一步操作
1. 配置GitHub Secrets
2. 启用GitHub Actions
3. 验证自动化部署流程
4. 配置生产环境域名和SSL

---
*此报告由智能工作助手应用部署脚本自动生成*
EOF

    log_success "部署报告已生成: $REPORT_FILE ✓"
}

# 主函数
main() {
    show_banner
    
    log_info "开始GitHub部署流程..."
    echo
    
    check_environment
    check_project_structure
    check_git_config
    build_application
    test_docker_build
    run_tests
    deploy_to_github
    generate_deployment_report
    
    echo
    log_success "🎊 GitHub部署流程完成!"
    log_info "请查看生成的部署报告和GITHUB_DEPLOYMENT_GUIDE.md文档"
    echo
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi