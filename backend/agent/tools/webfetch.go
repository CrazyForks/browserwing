package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Ingenimax/agent-sdk-go/pkg/interfaces"
	md "github.com/JohannesKaufmann/html-to-markdown"
)

// WebFetchTool fetches web pages and converts them to specified format
type WebFetchTool struct{}

// Name tool name
func (t *WebFetchTool) Name() string {
	return "webfetch"
}

// Description tool description
func (t *WebFetchTool) Description() string {
	return "Fetch a web page and convert it to specified format (html or markdown)"
}

// InputSchema input parameter schema
func (t *WebFetchTool) InputSchema() map[string]interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL of the web page to fetch",
				"required":    true,
			},
			"format": map[string]interface{}{
				"type":        "string",
				"description": "Output format: 'html' or 'markdown' (default: markdown)",
				"enum":        []string{"html", "markdown"},
				"default":     "markdown",
			},
		},
		"required": []string{"url"},
	}
}

// Parameters parameter specification
func (t *WebFetchTool) Parameters() map[string]interfaces.ParameterSpec {
	return map[string]interfaces.ParameterSpec{
		"url": {
			Type:        "string",
			Description: "The URL of the web page to fetch",
			Required:    true,
		},
		"format": {
			Type:        "string",
			Description: "Output format: 'html' or 'markdown' (default: markdown)",
			Required:    false,
		},
	}
}

// Execute executes the tool
func (t *WebFetchTool) Execute(ctx context.Context, input string) (string, error) {
	// Parse input parameters
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(input), &params); err != nil {
		return "", fmt.Errorf("failed to parse input parameters: %w", err)
	}

	// Get URL parameter
	urlStr, ok := params["url"].(string)
	if !ok || urlStr == "" {
		return "", fmt.Errorf("url parameter is required")
	}

	// Get format parameter, default to markdown
	format := "markdown"
	if formatParam, ok := params["format"].(string); ok && formatParam != "" {
		format = formatParam
	}

	// Validate format
	if format != "html" && format != "markdown" {
		return "", fmt.Errorf("format must be 'html' or 'markdown', got: %s", format)
	}

	// Fetch the web page
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", urlStr, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set user agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP error: %d %s", resp.StatusCode, resp.Status)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	htmlContent := string(body)

	// Convert to requested format
	var result string
	if format == "markdown" {
		converter := md.NewConverter("", true, nil)
		markdown, err := converter.ConvertString(htmlContent)
		if err != nil {
			return "", fmt.Errorf("failed to convert to markdown: %w", err)
		}
		result = markdown
	} else {
		result = htmlContent
	}

	// Return result as JSON
	output := map[string]interface{}{
		"url":     urlStr,
		"format":  format,
		"content": result,
	}

	jsonOutput, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal output: %w", err)
	}

	return string(jsonOutput), nil
}

// Run execute tool (compatible with old interface)
func (t *WebFetchTool) Run(ctx context.Context, input string) (string, error) {
	return t.Execute(ctx, input)
}
