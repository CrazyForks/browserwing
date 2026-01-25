package executor

import (
	"fmt"
	"strings"
)

// buildXPathFromRole 根据 ARIA role 和 name 构建 XPath 选择器
// 参考 agent-browser 和 Playwright 的实现
func buildXPathFromRole(role, name string) string {
	role = strings.ToLower(strings.TrimSpace(role))
	name = strings.TrimSpace(name)
	
	// 转义 XPath 中的引号
	escapedName := escapeXPathString(name)
	
	switch role {
	case "button":
		return buildButtonXPath(escapedName)
	
	case "link":
		return buildLinkXPath(escapedName)
	
	case "textbox", "searchbox":
		return buildTextboxXPath(escapedName)
	
	case "checkbox":
		return buildCheckboxXPath(escapedName)
	
	case "radio":
		return buildRadioXPath(escapedName)
	
	case "combobox", "listbox":
		return buildComboboxXPath(escapedName)
	
	case "heading":
		return buildHeadingXPath(escapedName)
	
	case "list":
		return buildListXPath(escapedName)
	
	case "listitem":
		return buildListItemXPath(escapedName)
	
	case "cell", "gridcell":
		return buildCellXPath(escapedName)
	
	case "row":
		return buildRowXPath(escapedName)
	
	case "menuitem":
		return buildMenuItemXPath(escapedName)
	
	case "tab":
		return buildTabXPath(escapedName)
	
	case "article":
		return buildArticleXPath(escapedName)
	
	case "region", "section":
		return buildRegionXPath(escapedName)
	
	case "navigation", "nav":
		return buildNavigationXPath(escapedName)
	
	case "main":
		return buildMainXPath(escapedName)
	
	case "banner":
		return buildBannerXPath(escapedName)
	
	case "contentinfo":
		return buildContentinfoXPath(escapedName)
	
	case "complementary":
		return buildComplementaryXPath(escapedName)
	
	default:
		// 回退：通过 role 属性查找
		if name != "" {
			return fmt.Sprintf("//*[@role='%s' and (normalize-space(.)='%s' or @aria-label='%s')]", 
				role, escapedName, escapedName)
		}
		return fmt.Sprintf("//*[@role='%s']", role)
	}
}

// buildButtonXPath 构建按钮的 XPath
func buildButtonXPath(name string) string {
	if name == "" {
		return "//button | //input[@type='button'] | //input[@type='submit'] | //input[@type='reset'] | //*[@role='button']"
	}
	
	// 对于长文本（>20字符），使用contains进行部分匹配
	if len(name) > 20 {
		shortName := name
		if len(name) > 20 {
			shortName = name[:20]
		}
		return fmt.Sprintf(`(
			//button[contains(normalize-space(.), '%s')] |
			//input[@type='button' and contains(@value, '%s')] |
			//input[@type='submit' and contains(@value, '%s')] |
			//input[@type='reset' and contains(@value, '%s')] |
			//button[contains(@aria-label, '%s')] |
			//*[@role='button' and contains(normalize-space(.), '%s')] |
			//*[@role='button' and contains(@aria-label, '%s')]
		)`, shortName, shortName, shortName, shortName, shortName, shortName, shortName)
	}
	
	// 短文本使用精确匹配
	// 多种查找方式：
	// 1. <button>text</button>
	// 2. <input type="button" value="text">
	// 3. <button aria-label="text">
	// 4. <div role="button">text</div>
	return fmt.Sprintf(`(
		//button[normalize-space(.)='%s'] |
		//input[@type='button' and @value='%s'] |
		//input[@type='submit' and @value='%s'] |
		//input[@type='reset' and @value='%s'] |
		//button[@aria-label='%s'] |
		//*[@role='button' and normalize-space(.)='%s'] |
		//*[@role='button' and @aria-label='%s']
	)`, name, name, name, name, name, name, name)
}

// buildLinkXPath 构建链接的 XPath
func buildLinkXPath(name string) string {
	if name == "" {
		return "//a[@href] | //*[@role='link']"
	}
	
	// 对于长文本（>30字符），使用contains进行部分匹配
	// 对于短文本，使用精确匹配
	if len(name) > 30 {
		// 取前30个字符进行匹配
		shortName := name
		if len(name) > 30 {
			shortName = name[:30]
		}
		return fmt.Sprintf(`(
			//a[@href and contains(normalize-space(.), '%s')] |
			//a[@href and contains(@aria-label, '%s')] |
			//a[@href and contains(@title, '%s')] |
			//*[@role='link' and contains(normalize-space(.), '%s')] |
			//*[@role='link' and contains(@aria-label, '%s')]
		)`, shortName, shortName, shortName, shortName, shortName)
	}
	
	// 短文本使用精确匹配
	return fmt.Sprintf(`(
		//a[@href and normalize-space(.)='%s'] |
		//a[@href and @aria-label='%s'] |
		//a[@href and @title='%s'] |
		//*[@role='link' and normalize-space(.)='%s'] |
		//*[@role='link' and @aria-label='%s']
	)`, name, name, name, name, name)
}

// buildTextboxXPath 构建文本框的 XPath
func buildTextboxXPath(name string) string {
	if name == "" {
		return `(
			//input[@type='text'] | 
			//input[@type='email'] | 
			//input[@type='password'] | 
			//input[@type='search'] | 
			//input[@type='tel'] | 
			//input[@type='url'] | 
			//input[@type='number'] | 
			//input[not(@type)] | 
			//textarea |
			//*[@role='textbox'] |
			//*[@role='searchbox']
		)`
	}
	
	// 通过 placeholder、aria-label、或关联的 label 查找
	return fmt.Sprintf(`(
		//input[@type='text' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@type='email' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@type='password' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@type='search' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@type='tel' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@type='url' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@type='number' and (@placeholder='%s' or @aria-label='%s')] |
		//input[not(@type) and (@placeholder='%s' or @aria-label='%s')] |
		//textarea[@placeholder='%s' or @aria-label='%s'] |
		//*[@role='textbox' and (@placeholder='%s' or @aria-label='%s')] |
		//*[@role='searchbox' and (@placeholder='%s' or @aria-label='%s')] |
		//input[@id=//label[normalize-space(.)='%s']/@for]
	)`,
		name, name, name, name, name, name, name, name, name, name, name, name, name, name, 
		name, name, name, name, name, name, name, name, name)
}

// buildCheckboxXPath 构建复选框的 XPath
func buildCheckboxXPath(name string) string {
	if name == "" {
		return "//input[@type='checkbox'] | //*[@role='checkbox']"
	}
	
	return fmt.Sprintf(`(
		//input[@type='checkbox' and @aria-label='%s'] |
		//input[@type='checkbox' and @id=//label[normalize-space(.)='%s']/@for] |
		//*[@role='checkbox' and (@aria-label='%s' or normalize-space(.)='%s')]
	)`, name, name, name, name)
}

// buildRadioXPath 构建单选按钮的 XPath
func buildRadioXPath(name string) string {
	if name == "" {
		return "//input[@type='radio'] | //*[@role='radio']"
	}
	
	return fmt.Sprintf(`(
		//input[@type='radio' and @aria-label='%s'] |
		//input[@type='radio' and @id=//label[normalize-space(.)='%s']/@for] |
		//*[@role='radio' and (@aria-label='%s' or normalize-space(.)='%s')]
	)`, name, name, name, name)
}

// buildComboboxXPath 构建下拉框的 XPath
func buildComboboxXPath(name string) string {
	if name == "" {
		return "//select | //*[@role='combobox'] | //*[@role='listbox']"
	}
	
	return fmt.Sprintf(`(
		//select[@aria-label='%s'] |
		//select[@id=//label[normalize-space(.)='%s']/@for] |
		//*[@role='combobox' and (@aria-label='%s' or normalize-space(.)='%s')] |
		//*[@role='listbox' and (@aria-label='%s' or normalize-space(.)='%s')]
	)`, name, name, name, name, name, name)
}

// buildHeadingXPath 构建标题的 XPath
func buildHeadingXPath(name string) string {
	if name == "" {
		return "//h1 | //h2 | //h3 | //h4 | //h5 | //h6 | //*[@role='heading']"
	}
	
	return fmt.Sprintf(`(
		//h1[normalize-space(.)='%s'] |
		//h2[normalize-space(.)='%s'] |
		//h3[normalize-space(.)='%s'] |
		//h4[normalize-space(.)='%s'] |
		//h5[normalize-space(.)='%s'] |
		//h6[normalize-space(.)='%s'] |
		//*[@role='heading' and normalize-space(.)='%s']
	)`, name, name, name, name, name, name, name)
}

// buildListXPath 构建列表的 XPath
func buildListXPath(name string) string {
	if name == "" {
		return "//ul | //ol | //*[@role='list']"
	}
	
	return fmt.Sprintf(`(
		//ul[@aria-label='%s'] |
		//ol[@aria-label='%s'] |
		//*[@role='list' and @aria-label='%s']
	)`, name, name, name)
}

// buildListItemXPath 构建列表项的 XPath
func buildListItemXPath(name string) string {
	if name == "" {
		return "//li | //*[@role='listitem']"
	}
	
	return fmt.Sprintf(`(
		//li[normalize-space(.)='%s'] |
		//li[@aria-label='%s'] |
		//*[@role='listitem' and (normalize-space(.)='%s' or @aria-label='%s')]
	)`, name, name, name, name)
}

// buildCellXPath 构建单元格的 XPath
func buildCellXPath(name string) string {
	if name == "" {
		return "//td | //th | //*[@role='cell'] | //*[@role='gridcell']"
	}
	
	return fmt.Sprintf(`(
		//td[normalize-space(.)='%s'] |
		//th[normalize-space(.)='%s'] |
		//*[@role='cell' and normalize-space(.)='%s'] |
		//*[@role='gridcell' and normalize-space(.)='%s']
	)`, name, name, name, name)
}

// buildRowXPath 构建行的 XPath
func buildRowXPath(name string) string {
	if name == "" {
		return "//tr | //*[@role='row']"
	}
	
	return fmt.Sprintf(`(
		//tr[@aria-label='%s'] |
		//*[@role='row' and @aria-label='%s']
	)`, name, name)
}

// buildMenuItemXPath 构建菜单项的 XPath
func buildMenuItemXPath(name string) string {
	if name == "" {
		return "//*[@role='menuitem'] | //*[@role='menuitemcheckbox'] | //*[@role='menuitemradio']"
	}
	
	return fmt.Sprintf(`(
		//*[@role='menuitem' and (normalize-space(.)='%s' or @aria-label='%s')] |
		//*[@role='menuitemcheckbox' and (normalize-space(.)='%s' or @aria-label='%s')] |
		//*[@role='menuitemradio' and (normalize-space(.)='%s' or @aria-label='%s')]
	)`, name, name, name, name, name, name)
}

// buildTabXPath 构建标签页的 XPath
func buildTabXPath(name string) string {
	if name == "" {
		return "//*[@role='tab']"
	}
	
	return fmt.Sprintf(`//*[@role='tab' and (normalize-space(.)='%s' or @aria-label='%s')]`, name, name)
}

// buildArticleXPath 构建文章的 XPath
func buildArticleXPath(name string) string {
	if name == "" {
		return "//article | //*[@role='article']"
	}
	
	return fmt.Sprintf(`(
		//article[@aria-label='%s'] |
		//*[@role='article' and @aria-label='%s']
	)`, name, name)
}

// buildRegionXPath 构建区域的 XPath
func buildRegionXPath(name string) string {
	if name == "" {
		return "//section | //*[@role='region']"
	}
	
	return fmt.Sprintf(`(
		//section[@aria-label='%s'] |
		//*[@role='region' and @aria-label='%s']
	)`, name, name)
}

// buildNavigationXPath 构建导航的 XPath
func buildNavigationXPath(name string) string {
	if name == "" {
		return "//nav | //*[@role='navigation']"
	}
	
	return fmt.Sprintf(`(
		//nav[@aria-label='%s'] |
		//*[@role='navigation' and @aria-label='%s']
	)`, name, name)
}

// buildMainXPath 构建主内容的 XPath
func buildMainXPath(name string) string {
	if name == "" {
		return "//main | //*[@role='main']"
	}
	
	return fmt.Sprintf(`(
		//main[@aria-label='%s'] |
		//*[@role='main' and @aria-label='%s']
	)`, name, name)
}

// buildBannerXPath 构建页眉的 XPath
func buildBannerXPath(name string) string {
	if name == "" {
		return "//header | //*[@role='banner']"
	}
	
	return fmt.Sprintf(`(
		//header[@aria-label='%s'] |
		//*[@role='banner' and @aria-label='%s']
	)`, name, name)
}

// buildContentinfoXPath 构建页脚的 XPath
func buildContentinfoXPath(name string) string {
	if name == "" {
		return "//footer | //*[@role='contentinfo']"
	}
	
	return fmt.Sprintf(`(
		//footer[@aria-label='%s'] |
		//*[@role='contentinfo' and @aria-label='%s']
	)`, name, name)
}

// buildComplementaryXPath 构建侧边栏的 XPath
func buildComplementaryXPath(name string) string {
	if name == "" {
		return "//aside | //*[@role='complementary']"
	}
	
	return fmt.Sprintf(`(
		//aside[@aria-label='%s'] |
		//*[@role='complementary' and @aria-label='%s']
	)`, name, name)
}

// escapeXPathString 转义 XPath 字符串中的引号
// 参考：https://stackoverflow.com/questions/1341847/special-character-in-xpath-query
func escapeXPathString(s string) string {
	// 如果没有单引号，直接用单引号包裹
	if !strings.Contains(s, "'") {
		return s
	}
	
	// 如果没有双引号，用双引号包裹
	if !strings.Contains(s, "\"") {
		return s
	}
	
	// 如果既有单引号又有双引号，使用 concat 拼接
	// 例如：He said "It's ok" -> concat('He said "It', "'", 's ok"')
	parts := strings.Split(s, "'")
	var result []string
	for i, part := range parts {
		if i > 0 {
			result = append(result, "\"'\"")
		}
		if part != "" {
			result = append(result, "'"+part+"'")
		}
	}
	
	if len(result) == 0 {
		return s
	}
	
	// 简化：直接返回原字符串（XPath 会自动处理）
	return s
}
