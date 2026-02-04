// XHR/Fetch 拦截器 - 页面加载时立即注入
// 此脚本在页面加载的最早期就开始监听，确保不会漏掉任何请求

(function() {
	'use strict';
	
	// 防止重复注入
	if (window.__browserwingXHRInterceptor__) {
		return;
	}
	window.__browserwingXHRInterceptor__ = true;
	
	// 初始化全局变量
	window.__capturedXHRs__ = window.__capturedXHRs__ || [];
	
	console.log('[BrowserWing XHR] Interceptor initialized at:', new Date().toISOString());
	
	// 拦截 XMLHttpRequest
	var originalXHROpen = XMLHttpRequest.prototype.open;
	var originalXHRSend = XMLHttpRequest.prototype.send;
	
	XMLHttpRequest.prototype.open = function(method, url) {
		this.__browserwing_xhr_info__ = {
			id: 'xhr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
			type: 'xhr',
			method: method,
			url: url,
			startTime: Date.now(),
			requestHeaders: {},
			responseHeaders: {},
			status: null,
			statusText: null,
			response: null,
			responseType: this.responseType || 'text'
		};
		return originalXHROpen.apply(this, arguments);
	};
	
	XMLHttpRequest.prototype.send = function(body) {
		var xhr = this;
		var xhrInfo = xhr.__browserwing_xhr_info__;
		
		if (xhrInfo) {
			// 记录请求体
			xhrInfo.requestBody = body;
			
			// 监听加载完成事件
			xhr.addEventListener('readystatechange', function() {
				if (xhr.readyState === 4) {
					xhrInfo.endTime = Date.now();
					xhrInfo.duration = xhrInfo.endTime - xhrInfo.startTime;
					xhrInfo.status = xhr.status;
					xhrInfo.statusText = xhr.statusText;
					
					// 只捕获成功的请求（状态码200-299），过滤掉network error和其他错误
					if (xhr.status === 0 || xhr.status < 200 || xhr.status >= 400) {
						console.log('[BrowserWing XHR] Skipped failed request:', xhrInfo.method, xhrInfo.url, 'Status:', xhr.status);
						return;
					}
					
					// 获取响应头
					try {
						var responseHeaders = xhr.getAllResponseHeaders();
						if (responseHeaders) {
							responseHeaders.split('\r\n').forEach(function(line) {
								var parts = line.split(': ');
								if (parts.length === 2) {
									xhrInfo.responseHeaders[parts[0]] = parts[1];
								}
							});
						}
					} catch (e) {
						console.warn('[BrowserWing XHR] Failed to get response headers:', e);
					}
					
					// 获取响应数据
					try {
						if (xhr.responseType === '' || xhr.responseType === 'text') {
							xhrInfo.response = xhr.responseText;
							xhrInfo.responseSize = xhr.responseText ? xhr.responseText.length : 0;
						} else if (xhr.responseType === 'json') {
							xhrInfo.response = xhr.response;
							xhrInfo.responseSize = JSON.stringify(xhr.response).length;
						} else {
							xhrInfo.response = '[Binary Data]';
							xhrInfo.responseSize = 0;
						}
					} catch (e) {
						console.warn('[BrowserWing XHR] Failed to get response:', e);
						xhrInfo.response = '[Error reading response]';
					}
					
					// 添加到捕获列表
					window.__capturedXHRs__.push(xhrInfo);
					console.log('[BrowserWing XHR] Captured:', xhrInfo.method, xhrInfo.url, 'Status:', xhrInfo.status);
					
					// 如果录制UI已加载，更新角标
					if (window.updateXHRButtonBadge && typeof window.updateXHRButtonBadge === 'function') {
						window.updateXHRButtonBadge();
					}
				}
			});
		}
		
		return originalXHRSend.apply(this, arguments);
	};
	
	// 拦截 Fetch API
	var originalFetch = window.fetch;
	window.fetch = function(input, init) {
		var url = typeof input === 'string' ? input : input.url;
		var method = (init && init.method) || 'GET';
		
		var fetchInfo = {
			id: 'fetch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
			type: 'fetch',
			method: method.toUpperCase(),
			url: url,
			startTime: Date.now(),
			requestHeaders: (init && init.headers) || {},
			requestBody: (init && init.body) || null,
			responseHeaders: {},
			status: null,
			statusText: null,
			response: null
		};
		
		return originalFetch.apply(this, arguments).then(function(response) {
			fetchInfo.endTime = Date.now();
			fetchInfo.duration = fetchInfo.endTime - fetchInfo.startTime;
			fetchInfo.status = response.status;
			fetchInfo.statusText = response.statusText;
			
			// 只捕获成功的请求（状态码200-299），过滤掉错误请求
			if (response.status < 200 || response.status >= 400) {
				console.log('[BrowserWing Fetch] Skipped failed request:', fetchInfo.method, fetchInfo.url, 'Status:', response.status);
				return response;
			}
			
			// 获取响应头
			response.headers.forEach(function(value, key) {
				fetchInfo.responseHeaders[key] = value;
			});
			
			// 克隆响应以便读取body
			var clonedResponse = response.clone();
			
			// 尝试读取响应体
			var contentType = response.headers.get('content-type') || '';
			if (contentType.indexOf('application/json') !== -1) {
				clonedResponse.json().then(function(data) {
					fetchInfo.response = data;
					fetchInfo.responseSize = JSON.stringify(data).length;
					window.__capturedXHRs__.push(fetchInfo);
					console.log('[BrowserWing Fetch] Captured:', fetchInfo.method, fetchInfo.url, 'Status:', fetchInfo.status);
					
					// 如果录制UI已加载，更新角标
					if (window.updateXHRButtonBadge && typeof window.updateXHRButtonBadge === 'function') {
						window.updateXHRButtonBadge();
					}
				}).catch(function(e) {
					console.warn('[BrowserWing Fetch] Failed to parse JSON response:', e);
				});
			} else if (contentType.indexOf('text/') !== -1) {
				clonedResponse.text().then(function(text) {
					fetchInfo.response = text;
					fetchInfo.responseSize = text.length;
					window.__capturedXHRs__.push(fetchInfo);
					console.log('[BrowserWing Fetch] Captured:', fetchInfo.method, fetchInfo.url, 'Status:', fetchInfo.status);
					
					// 如果录制UI已加载，更新角标
					if (window.updateXHRButtonBadge && typeof window.updateXHRButtonBadge === 'function') {
						window.updateXHRButtonBadge();
					}
				}).catch(function(e) {
					console.warn('[BrowserWing Fetch] Failed to read text response:', e);
				});
			} else {
				fetchInfo.response = '[Binary or unknown content type]';
				fetchInfo.responseSize = 0;
				window.__capturedXHRs__.push(fetchInfo);
				console.log('[BrowserWing Fetch] Captured:', fetchInfo.method, fetchInfo.url, 'Status:', fetchInfo.status);
				
				// 如果录制UI已加载，更新角标
				if (window.updateXHRButtonBadge && typeof window.updateXHRButtonBadge === 'function') {
					window.updateXHRButtonBadge();
				}
			}
			
			return response;
		}).catch(function(error) {
			// Network error - 不记录
			console.log('[BrowserWing Fetch] Skipped network error:', fetchInfo.method, fetchInfo.url, error);
			fetchInfo.endTime = Date.now();
			fetchInfo.duration = fetchInfo.endTime - fetchInfo.startTime;
			throw error;
		});
	};
	
	console.log('[BrowserWing XHR] Interceptor ready - monitoring all XHR/Fetch requests');
})();
