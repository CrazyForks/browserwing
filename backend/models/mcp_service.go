package models

import "time"

// MCPServiceType MCP服务类型
type MCPServiceType string

const (
	MCPServiceTypeStdio MCPServiceType = "stdio" // 标准输入输出
	MCPServiceTypeSSE   MCPServiceType = "sse"   // Server-Sent Events
	MCPServiceTypeHTTP  MCPServiceType = "http"  // HTTP
)

// MCPServiceStatus MCP服务状态
type MCPServiceStatus string

const (
	MCPServiceStatusDisconnected MCPServiceStatus = "disconnected" // 未连接
	MCPServiceStatusConnecting   MCPServiceStatus = "connecting"   // 连接中
	MCPServiceStatusConnected    MCPServiceStatus = "connected"    // 已连接
	MCPServiceStatusError        MCPServiceStatus = "error"        // 错误
)

// MCPService 外部MCP服务配置
type MCPService struct {
	ID          string           `json:"id"`          // 服务唯一标识
	Name        string           `json:"name"`        // 服务名称
	Description string           `json:"description"` // 服务描述
	Type        MCPServiceType   `json:"type"`        // 服务类型: stdio | sse | http
	Command     string           `json:"command"`     // 命令 (stdio类型)
	Args        []string         `json:"args"`        // 命令参数 (stdio类型)
	URL         string           `json:"url"`         // 服务URL (sse/http类型)
	Env         map[string]string `json:"env"`        // 环境变量
	Enabled     bool             `json:"enabled"`     // 是否启用
	Status      MCPServiceStatus `json:"status"`      // 连接状态
	ToolCount   int              `json:"tool_count"`  // 发现的工具数量
	LastError   string           `json:"last_error"`  // 最后的错误信息
	CreatedAt   time.Time        `json:"created_at"`  // 创建时间
	UpdatedAt   time.Time        `json:"updated_at"`  // 更新时间
}

// MCPDiscoveredTool MCP发现的工具信息
type MCPDiscoveredTool struct {
	Name        string                 `json:"name"`        // 工具名称
	Description string                 `json:"description"` // 工具描述
	Enabled     bool                   `json:"enabled"`     // 是否启用该工具
	Schema      map[string]interface{} `json:"schema"`      // 工具的输入Schema
}

