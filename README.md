# Introduction
一个使用快捷键进行操作的JSON编辑器，使用快捷键让编辑工作更加方便、快捷。
可自由导入任何数据类型的值到编辑器中进行编辑，编辑后可导出对象或JSON字符串。

A JSON editor that uses shortcut keys to make editing work easier and faster.
You can import values of any data type into the editor for editing, and you can export objects or JSON strings after editing.

# Be applicable
- Chrome
- Firefox
- Safari
- Opera
- IE >= 9

# Use
### import  "json-editor.js"
```
<script type="text/javascript" src="json-editor.js"></script>
```

### instance  "jsonEditor"
```
<script type="text/javascript">
<!--
window.onload = function () {
	var editor = new jsonEditor(
		"jsonEditorBox",
		{
			'str': 'hello world!',
			'number':1,
			'boolean': true,
			'list': [1, 2, 3, 4],
			'empty': [],
			'object': {
				'key1': null,
				'key2': false,
				'key3': ['xxx', 'yyy', 'zzzz'],
				'key4': function (){}
			}
		},
		{
			hotKey: 'J',
			width: 680,
			height: 480
		}
	);
}
-->
</script>
```

**更详细的API接口说明和快捷键操作说明，请查看“doc/Manual.pdf”文件**  
**For more detailed API interface descriptions and shortcut key operation instructions, please see the "doc/Manual.pdf" file.**
