//javascript document

//jshint -W043
//jshint -W030

/**
 * 
 * @authors oldfour (oldfour619@163.com)
 * @date    2019-06-22
 * @version 1.0.3
 */

/** Bookmark:
 * 	[INSERT-NEW-ROW]
 * 	[CLASS:*]
 * 	[禁止冒泡:*]
 * 	[构造函数:*]
 * 	[HOTKEY:*]
 *  [EDITABLE:*]
 *  [REMOVE:*]
 */

window.jsonEditor = (function (){
	// check browser kernel and version
	if (/\bMSIE\s+[1-8](\.\d+)?\;/.test(navigator.userAgent)) {
		throw([
			"不支持您当前的浏览器。" + 
			"请使用最新版本的 chrome、firefox、safari、opera 等浏览器，或IE9及以上版本的浏览器。",
			"Your current browser is not supported. " + 
			"Please use the latest version of chrome, firefox, safari, opera, etc., or IE9 and above."
		].join("\n"));
	}
	// ++++++++++++++++++++ constant ++++++++++++++++++++
	var __VERSION__ = '1.0.3',
		__AUTHOR__ = 'oldfour',
		IS_WEBKIT = /\bAppleWebKit\b/.test(navigator.userAgent),			//webkit 内核浏览器
		IS_MSIE = /\b(MSIE|Trident)\b/.test(navigator.userAgent),			//IE 内核浏览器;
		NODEID_PREFIX = "jed",
		CLASS_PREFIX = "json-editor",
		ATTR_DATAVALUE = 'data-value',
		ATTR_TABINDEX = 'tabIndex',
		REG_NUMBER = /^(?:(0b[01]+)|(0O?[0-8]*)|(\-?[1-9]\d*(\.\d+)?|0|\-?0(\.\d+))|(\-?[1-9]\d*(?:\.\d+)?\e\d+|\-?0\.\d+\e\d+)|(0x[a-f\d]+))$/i,
		REG_SELECTOR = /^((?:[^\"\,]+|\"(?:\\\"|\\|[^\\\"])*\")+(?:,|$))+$/,
		REG_SELECTSEG = /((?:[^\"\,]+|\"(?:\\\"|\\|[^\\\"])*\")+)(?:,|$)/g,
		REG_SIZEATTR = /^(?:auto|inherit|([1-9]\d*)(?:px)?|(0(?:\.\d+)|[1-9]\d(?:\.\d+)?)%)$/i,
		TAB_INDEX = -1,
		DATA_TYPES = {
			'null': {order:0, value:null},
			'boolean': {order:1, value:false},
			'number': {order:2, value:0},
			'string': {order:3, value:''},
			'array': {order:4, value:[]},
			'object': {order:5, value:{}}
		},
		KEY_TAB = 9,
		KEY_ENTER = 13,
		KEY_ESC = 27,
		KEY_PGUP = 33,
		KEY_PGDN = 34,
		KEY_LEFT = 37,
		KEY_UP = 38,
		KEY_RIGHT = 39,
		KEY_DOWN = 40,
		KEY_DEL = 46,
		KEY_WAVE = 192,
		KEY_C = 67,
		KEY_X = 88,
		KEY_V = 86;

	// ++++++++++++++++++++ basic function ++++++++++++++++++++
	function string(val) {
		return val == null ? '' : String(val).toString();
	}
	function isFunction(val) {
		return typeof val == 'function';
	}
	function isArray(val) {
		return Object.prototype.toString.call(val) == '[object Array]';
	}
	function isPlainObject(obj) {
		//先去掉类型不是 Object 的：
		//也就是用 Object.prototype.toString.call(obj) 这种方式，返回值不是 "[object Object]" 的，比如 Array、window、history
		if (!obj || Object.prototype.toString.call(obj) !== "[object Object]") {
			return false;
		}
		//获取对象原型，赋值给 proto
		var proto = Object.getPrototypeOf(obj), fnHasOwnPro = Object.prototype.hasOwnProperty;
		//如果是没有原型的对象，那也算纯粹的对象（比如用 Object.create(null) 这种方式创建的对象）
		if (!proto) {
			return true;
		}
		//最后判断是不是通过 "{}" 或 "new Object" 方式创建的对象：
			/* 如果 proto 有 constructor 属性，Ctor 的值就等于 proto.constructor（原型的 constructor 属性指向关联的构造函数）*/
		var Ctor = fnHasOwnPro.call(proto, "constructor") && proto.constructor;
			/* 如果 Ctor 类型是  "function" ，并且调用Function.prototype.toString 方法后得到的字符串 与
			   "function Object() { [native code] }" 这样的字符串相等就返回true（用来区分自定义构造函数和 Object 构造函数）*/
		return typeof Ctor === "function" && fnHasOwnPro.toString.call(Ctor) === fnHasOwnPro.toString.call(Object);
	}
	// 判断是否是 html 节点（该方式只适合于现代浏览器（包括IE10～11））
	function isElement(a){
		if(a && typeof a == 'object' && a != a.window && a.constructor){
			var s = Object.prototype.toString.call(a);
			return s == '[object Document]' || s == '[object HTMLDocument]' || /^\[object HTML([\da-zA-Z]*)Element\]$/.test(s);
		}
		return 0;
	}
	// 添加样式表
	function addStyleSheet(styleText) {
		styleText = string(styleText);
		if (styleText != "") {
			if (IS_MSIE) {
				document.createStyleSheet().cssText = styleText;
			} else {
				var style = document.createElement('style'),
					head = document.getElementsByTagName('HEAD'); 
			        style.type = 'text/css'; 
			        style.innerHTML = styleText;
			    if (!head.length) {
			    	document.documentElement.appendChild(style);
			    } else {
			        head.item(0).appendChild(style);
			    }
			}
		}
	}

	// ++++++++++++++++++++ profession function ++++++++++++++++++++
	// 粘帖事件
	function pasteContent(event) {
		var text, textRange;
		if (IS_MSIE) {
			text = window.clipboardData.getData('text');
			textRange = document.selection.createRange();
			textRange.text = text;
            textRange.collapse(false);
            textRange.select();
		} else if (event) {
			text = (event.originalEvent || event).clipboardData.getData('text/plain').replace(/[\r\n]/g, ' ');
			var textNode = document.createTextNode(text),
				selection = window.getSelection();
			//第一个选择区间
			textRange = selection.getRangeAt(0);
			//清除选择的内容
            selection.deleteFromDocument();
            //插入文本
            textRange.insertNode(textNode);
            //定位选择区域的起始位置和结束位置（起始位置等于结束位置，实际就是没有选择内容）
	        textRange.setStartAfter(textNode);
	        textRange.setEndAfter(textNode);
	        //清除原来的选择区域
	        selection.removeAllRanges();
	        //重新选择内容（因为起始位置等于结束位置，实际就等于定位光标位置）
	        selection.addRange(textRange);
		}
        event.preventDefault();
        return false;
	}
	
	// ++++++++++++++++++++ variable ++++++++++++++++++++
	var pubCssStyle = "/* General CSS */\n\
/* Communal */\n\
{@prefix@},\n\
{@prefix@} ul,\n\
{@prefix@} li,\n\
{@prefix@} li key,\n\
{@prefix@} li var{\n\
	font-size: inherit;\n\
	font-family: inherit;\n\
	border-width: 1px;\n\
	border-style: dotted;\n\
	border-color: transparent;\n\
	border-radius: 2px;\n\
}\n\
{@prefix@} var ul:focus,\n\
{@prefix@} > li:focus,\n\
{@prefix@} ul li:focus,\n\
{@prefix@} li key:focus,\n\
{@prefix@} var.value-scalar:focus{\n\
	outline:none;\n\
	/* Cover the normal border color */\n\
	border-color: #007BB7 !important;\n\
}\n\
{@prefix@} key,\n\
{@prefix@} span,\n\
{@prefix@} var,\n\
{@prefix@} code{\n\
	width: auto;\n\
	min-height: inherit;\n\
	font-style: normal;\n\
	box-sizing: border-box !important;\n\
}\n\
/* Individuality */\n\
{@prefix@} {\n\
	margin: 0px;\n\
	padding: 3px;\n\
	box-sizing: border-box;\n\
}\n\
{@prefix@} ul{\n\
	padding: 0px 0px 0px 30px;\n\
	margin: 0px 0px 0px 2px;\n\
	box-sizing: content-box !important;\n\
	border-left-color: #474842;\n\
}\n\
{@prefix@} ul:empty::before,\n\
{@prefix@} key:empty::before,\n\
{@prefix@} var:empty::before{\n\
	content: \"<empty>\";\n\
	color: #74705D;\n\
	font-style: italic;\n\
}\n\
{@prefix@} li{\n\
	position: relative;\n\
	min-height: inherit;\n\
	margin: 0px;\n\
	padding: 1px;\n\
	list-style-type: none;\n\
}\n\
/* [key] */\n\
/* key editable */\n\
{@prefix@} key{\n\
	float: left;\n\
	white-space: nowrap;\n\
	text-overflow: ellipsis;\n\
	overflow: hidden;\n\
	min-width: 16px;\n\
	max-width: 240px;\n\
	-webkit-user-modify: read-write-plaintext-only;\n\
}\n\
/* [span] */\n\
{@prefix@} key + span{\n\
	float: left;\n\
	margin-right: 8px;\n\
}\n\
/* [var] */\n\
{@prefix@} var.value-string{\n\
	white-space:pre-wrap;\n\
}\n\
{@prefix@} var.shrink > code{\n\
	min-width:auto;\n\
}\n\
{@prefix@} var.shrink > ul{\n\
	margin:0px 8px;\n\
	padding: 0px; \n\
	width: auto;\n\
	border-color: transparent;\n\
	display: inline-block;\n\
}\n\
{@prefix@} var.shrink > ul:before{\n\
	content: \"...\";\n\
	color: #74705D;\n\
	font-style: italic;\n\
}\n\
{@prefix@} var.shrink > ul > li{\n\
	display:none;\n\
}\n\
{@prefix@} var.value-array,\n\
{@prefix@} var.value-object{\n\
	display: block;\n\
}\n\
/* 标量类型的“var”可编辑 */\n\
{@prefix@} var.value-undefined,\n\
{@prefix@} var.value-null,\n\
{@prefix@} var.value-boolean{\n\
	display: inline-block;\n\
	-webkit-user-modify: read-only\n\
}\n\
{@prefix@} var.value-number,\n\
{@prefix@} var.value-string{\n\
	display: inline-block;\n\
	-webkit-user-modify: read-write-plaintext-only;\n\
}\n\
{@prefix@} var.value-invalid{\n\
	/* Override user-defined text colors */\n\
	color: #000000 !important;\n\
	/* Override the border when getting focus */\n\
	border-color: #FFCEC1 !important;\n\
	background-color: #FFCEC1;\n\
}\n\
/* 标量类型的“var”后面、 “}” 或 “]” 后面追加“:” */\n\
{@prefix@} ul > li > var.value-scalar:after,\n\
{@prefix@} ul > li > var > code.bracket_right:after{\n\
	content: \",\"\n\
}\n\
/* 最后一个 “li” 里的 “var”、 “}” 、 “]” 后面不追加“:” */\n\
{@prefix@} ul > li:last-child > var:after,\n\
{@prefix@} ul > li:last-child > var > code.bracket_right:after{\n\
	content: none;\n\
}\n\
/* undefined, null 和 boolean 类型的“var”加粗 */\n\
{@prefix@} var.value-undefined,\n\
{@prefix@} var.value-null,\n\
{@prefix@} var.value-boolean{\n\
	font-weight: bold;\n\
}\n\
{@prefix@} code{\n\
	min-width: 32px;\n\
	display: inline-block;\n\
	cursor: pointer;\n\
	outline: none;\n\
}\n\
/* [dl] */\n\
{@prefix@} dl{\n\
	position: absolute;\n\
	z-index: 9999;\n\
	display: none;\n\
	font-family: \"Courier New\";\n\
	margin:0px;\n\
	padding:0px;\n\
	box-sizing: border-box !important;\n\
	box-shadow: 2px 2px 2px rgba(111, 111, 111, 0.85);\n\
	border: 0px none;\n\
	border-radius: 2px;\n\
	border:1px solid #B3B6BB;\n\
	width: 80px;\n\
	height: 122px;\n\
}\n\
{@prefix@} dl:focus{\n\
	outline:none;\n\
}\n\
{@prefix@} dl dd{\n\
	margin:0px;\n\
	padding:0px 0px 0px 8px;\n\
	border-width: 1px 0px;\n\
	border-style: solid;\n\
	/* Priority to user-defined style border color */\n\
	border-top-color: transparent !important;\n\
	font-size: 14px;\n\
	height: 20px;\n\
	line-height: 18px;\n\
	box-sizing: border-box !important;\n\
	cursor:pointer;\n\
}\n\
{@prefix@} dl dd:last-child{\n\
	/* Priority to user-defined style border color */\n\
	border-bottom-color: transparent !important;\n\
}\n\
{@prefix@} dl dd.active{\n\
	color: #FFFFFF;\n\
	font-weight: bold;\n\
	/* Cover the normal border color */\n\
	border-color: #007BB7 !important;\n\
}\n\
/* 下面是可自定义的配置 */\n\
{@prefix@} {\n\
	font-family: \"Courier New\";\n\
	font-size: 14px;\n\
	background-color: #000000;\n\
}\n\
{@prefix@} ul {\n\
	min-height: 18px; /*等于参数“item-height”计算*/\n\
}\n\
{@prefix@} li key,\n\
{@prefix@} li var,\n\
{@prefix@} li code{\n\
	line-height: 16px; /*由参数“item-height”计算*/\n\
}\n\
{@prefix@} key,\n\
{@prefix@} span{\n\
	color: #E8E8E8;\n\
	height:18px; /*等于参数“item-height”计算*/\n\
}\n\
{@prefix@} var.value-undefined,\n\
{@prefix@} var.value-null,\n\
{@prefix@} dd.type-null{\n\
	color: #C1670D;\n\
}\n\
{@prefix@} var.value-boolean,\n\
{@prefix@} dd.type-boolean{\n\
	color:#5CD9EF;\n\
}\n\
{@prefix@} var.value-number,\n\
{@prefix@} dd.type-number{\n\
	color:#8679DA;\n\
}\n\
{@prefix@} var.value-string,\n\
{@prefix@} dd.type-string{\n\
	color:#E6C04D;\n\
}\n\
{@prefix@} dd.type-array{\n\
	color:#3CFF0E;\n\
}\n\
{@prefix@} dd.type-object{\n\
	color:#3CFF0E;\n\
}\n\
{@prefix@} var code{\n\
	height: 18px; /*等于参数“item-height”计算*/\n\
	color: #3CFF0E;\n\
}\n\
{@prefix@} dl{\n\
	background: #33342E;\n\
}\n\
{@prefix@} dl dd{\n\
	border-color: #B3B6BB;\n\
}\n\
{@prefix@} dl dd.active {\n\
	background-color:#53564B;\n\
}\n\
",
		classRandom = (function () {
			var characters = [
				'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
				'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
				'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
				'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
				'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
			];
			var x, y, z = 8, l = characters.length - 1, result = [];
			for (x=0; x<z; x++){
				y = parseInt(Math.round(Math.random() * l), 10);
				result.push(characters[y]);
			}
			return "-" + result.join("");
		})(),
		acquireId = (function () {
			var lastId = 1000, prefix = NODEID_PREFIX + classRandom + "-";
			return function () {
				return prefix + (lastId++);
			};
		})(),
		nodeTemplate = (function () {
			var template = {
					outer: document.createElement('UL'),
					item: document.createElement('LI'),
					key: document.createElement('KEY'),
					colon: document.createElement('SPAN'),
					value: document.createElement('VAR'),
					list: document.createElement('UL'),
					brackets: document.createElement('CODE'),
					typemenu: document.createElement('DL'),
					newline: document.createTextNode('\n')
				};
			//生成 types 菜单
			var n, orderList = [], orderName = {}, optNode = document.createElement('DD');
			for (n in DATA_TYPES) {
				orderList.push(DATA_TYPES[n].order);
				orderName[DATA_TYPES[n].order] = n;
			}
			orderList.sort();
			var k, i, l = orderList.length;
			for (i=0; i < l; i++) {
				k = orderName[orderList[i]];
				n = optNode.cloneNode(true);
				n.setAttribute(ATTR_DATAVALUE, k);
				n.className = "type-" + k;
				n.innerHTML = k;
				template.typemenu.appendChild(n);
				delete orderName[k];
			}
			orderList.splice(0, l);
			// 需要添加内容的节点
			template.colon.appendChild(document.createTextNode(":"));
			// 设置属性
			template.typemenu.setAttribute(ATTR_TABINDEX, TAB_INDEX);
			template.item.setAttribute(ATTR_TABINDEX, TAB_INDEX);
			template.brackets.setAttribute(ATTR_TABINDEX, TAB_INDEX);
			template.list.setAttribute(ATTR_TABINDEX, TAB_INDEX);
			template.outer.setAttribute(ATTR_TABINDEX, TAB_INDEX);
			template.outer.className = CLASS_PREFIX + classRandom;
			return template;
		})(),
		rootNodeList = {};

	// ++++++++++++++++++++ class ++++++++++++++++++++

	// -------------------- 元素节点 --------------------
	// [CLASS:baseElement]
	function baseElement() {
		this.onclick = function (event) {
			event && event.stopPropagation();	//[STOP-PROPAGATION] baseElement.onclick
		};
		this.queryElement = function (selectorRule) {
			selectorRule = string(selectorRule);
			return selectorRule == "" ? null : this.parentNode.querySelector('#' + this.id + " " + selectorRule);
		};
		this.queryElementAll = function (selectorRule) {
			selectorRule = string(selectorRule);
			if (selectorRule != "") {
				if (selectorRule.indexOf(',') == -1 || ! REG_SELECTOR.test(selectorRule)) {
					selectorRule = '#' + this.id + " " + selectorRule;
				} else {
					// 当 exec() 再也找不到匹配的文本时，它将返回 null，并把 lastIndex 属性重置为 0
					var match = REG_SELECTSEG.exec(selectorRule), rules = [];
					while (match) {
						rules.push('#' + this.id + " " + match[1]);
						match = REG_SELECTSEG.exec(selectorRule);
					}
					selectorRule = rules.join(", ");
				}
			}
			return selectorRule != "" ? this.parentNode.querySelectorAll(selectorRule) : null;
		};
		this.queryParent = function (parentRule) {
			var parents = this.queryParentAll(parentRule);
			return !parents ? null : parents.pop();
		};
		this.queryParentAll = function (parentRule) {
			parentRule = string(parentRule).replace(/(^[\s+<]|[\s+<]$)/g, '');
			if (parentRule == "") {
				return [this.parentNode];
			}
			parentRule = parentRule.toUpperCase().split(/[\s+<]+/);
			var i, l = parentRule.length, pNode = this, parents = [];
			for (i=0; i < l; i++) {
				pNode = pNode.parentNode;
				if (!pNode || pNode.tagName != parentRule[i]) {
					return null;
				}
				parents.push(pNode);
			}
			return parents;
		};
	}
	baseElement.derive = (function () {
		var baseSuper = function() {};
		baseSuper.prototype = baseElement.prototype;
		return function(classObject) {
			if (isFunction(classObject)){
				classObject.prototype = new baseSuper();
				classObject.prototype.constructor = classObject;
			}
		};
	})();

	// [CLASS:rowElement]
	function rowElement() {
		var _this = this, typeMenu;
		//[HOTKEY:li] ESC/Enter/PageUp/PageDown/Up/ctrl+up/Down/ctrl+down
		function onKeyDown(event) {
			//是否是快捷键
			var isHotKey = false, keyCode = event.keyCode, positNode, targetRow;
			switch (keyCode) {
				case KEY_WAVE:
					event.ctrlKey && _this.openTypeMenu();
					isHotKey = true;
					break;
				case KEY_ESC:
					positNode = _this.parentNode;
					isHotKey = true;
					break;
				case KEY_DEL:
					if (event.shiftKey) {
						// 切换到合适的节点，优先顺序依次：下一行 -> 上一行 -> 父节点
						positNode = _this.parentNode;
						targetRow = _this.nextSibling;
						while (targetRow) {
							if (targetRow.tagName == 'LI' ) {
								positNode = targetRow;
								break;
							}
							targetRow = targetRow.nextSibling;
						}
						isHotKey = true;
						//删除
						_this.remove();
					}
					break;
				case KEY_TAB:
					if (!event.shiftKey) {
						positNode = _this.firstEditableNode();
					} else {
						var siblingNode = _this.previousSibling;
						positNode = siblingNode && siblingNode.tagName == 'LI' ? 
							siblingNode.lastEditableNode() : _this.queryParent('UL');
					}
					isHotKey = true;
					break;
				case KEY_ENTER:
					if (!event.shiftKey && !event.ctrlKey) {
						positNode = _this.firstEditableNode();
					} else {
						//获取数据类型
						var targetNode = _this.queryParent('UL < VAR'), dataType = targetNode ?  targetNode.dataType() : '';
						// [INSERT-NEW-ROW]
						if (dataType) {
							var keyNode, typesNode, rowNode = rowElement.instance();
							//如果是对象类型则添加key
							if (dataType == 'object') {
								keyNode = keyElement.instance("");
								rowNode.appendChild(keyNode);
								rowNode.appendChild(nodeTemplate.colon.cloneNode(true));
							}
							//添加数据类型菜单 和 value 节点
							typesNode = typesElement.instance();
							rowNode.appendChild(typesNode);
							// shift 键：插入到前面
							if (event.shiftKey) {
								_this.parentNode.insertBefore(rowNode, _this);
							// 有 ctrl 键：插入到后面
							} else if (_this.nextSibling) {
								_this.parentNode.insertBefore(rowNode, _this.nextSibling);
							} else {
								_this.parentNode.appendChild(rowNode);
							}
							//数据类型则显示菜单
							positNode = typesNode;
							positNode.show();
						}
					}
					isHotKey = true;
					break;
				case KEY_PGUP:
					if (_this.parentNode.hasChildNodes()) {
						positNode = _this.parentNode.firstChild;
					}
					isHotKey = true;
					break;
				case KEY_PGDN:
					if (_this.parentNode.hasChildNodes()) {
						positNode = _this.parentNode.lastChild;
					}
					isHotKey = true;
					break;
				case KEY_UP:
					targetRow = _this.previousSibling;
					// 选择上一行
					if (!event.ctrlKey) {
						if (!targetRow) {targetRow = _this.parentNode.lastChild;}
						positNode = targetRow;
					// 移动到上一行
					} else {
						if (targetRow) {_this.parentNode.insertBefore(_this, targetRow);}
						positNode = _this;
					}
					isHotKey = true;
					break;
				case KEY_DOWN:
					targetRow = _this.nextSibling;
					//选择下一行
					if (!event.ctrlKey) {
						if (!targetRow) {targetRow = _this.parentNode.firstChild;}
						positNode = targetRow;
					// 移动到下一行
					} else {
						if (targetRow) {
							targetRow = targetRow.nextSibling;
							if (!targetRow) {
								_this.parentNode.appendChild(_this);
							}
							else {
								_this.parentNode.insertBefore(_this, targetRow);
							}
							positNode = _this;
						}
					}
					isHotKey = true;
					break;
				case KEY_C:
					break;
				case KEY_X:
					break;
				case KEY_V:
					break;
			}
			//禁止冒泡
			event.stopPropagation();	//[禁止冒泡:rowElement.onkeydown]
			//如果是热键
			if (isHotKey) {
				event.preventDefault();			//取消默认动作
				positNode && positNode.focus();	//定位
				return false;					//返回
			}
			return true;
		}
		// 打开 type 菜单
		this.openTypeMenu = function() {
			if (typeMenu === undefined) {
				typeMenu =  _this.queryElement('>DL');
			}
			if (!typeMenu) {
				return false;
			}
			typeMenu.show();
			typeMenu.focus();
			return true;
		};
		//[editable:row.lastEditableNode] 选择 LI 节点内最后一个可编辑的节点
		this.lastEditableNode = function () {
			var target =  _this.querySelectorAll('KEY, VAR.value-scalar, VAR>UL');
			return target ? target[target.length - 1] : null;
		};
		//[editable:row.firstEditableNode] 选择 LI 节点内第一个可编辑的节点
		this.firstEditableNode = function () {
			var target = _this.queryElementAll(">KEY, >VAR.value-scalar, >VAR>UL");
			return target ? target[0] : null;
		};
		//[REMOVE:rowElement]
		this.remove = function () {
			var childNodes = _this.childNodes, length = childNodes.length, i;
			for (i = length - 1; i > -1; i--) {
				if (childNodes[i].tagName == 'VAR' || childNodes[i].tagName == 'DL' || childNodes[i].tagName == 'KEY') {
					childNodes[i].remove();
				} else {
					_this.removeChild(childNodes[i]);
				}
			}
			if (_this.id in rootNodeList) {
				delete rootNodeList[_this.id];
			}
			_this.parentNode && _this.parentNode.removeChild(_this);
		};
		// [构造函数:rowElement]
		function __construct(){
			//继承baseElement
			baseElement.call(_this);
			// 分配节点ID
			_this.id = acquireId();
			// 添加 Row 事件
			_this.onkeydown = onKeyDown;
		}
		__construct();
	}
	//派生于 baseElement
	baseElement.derive(rowElement);
	rowElement.instance = function () {
		var rowNode = nodeTemplate.item.cloneNode(true);
		rowElement.call(rowNode);
		return rowNode;
	};

	// -------------------- key节点 --------------------
	// [CLASS:keyElement]
	function keyElement(_key){
		var _this = this;
		function onFocus(event) {
			_this.style.webkitUserModify = 'plaintext-only';
			if (event.button === undefined || event.type == 'focus') {
				window.getSelection().collapse(_this, 1);
			}
			return event && event.stopPropagation();	//[禁止冒泡:keyElement.onfocus]
		}
		function onBlur(event) {
			_this.style.webkitUserModify = 'false';
			var valNode = _this.queryElement(' + SPAN + DL + VAR'), parentNode = _this.queryParent('LI');
			// 是未创建 var 节点的（临时节点）
			if (parentNode && (!valNode || !valNode.dataType())){
				parentNode.remove();
			}
		}
		//[HOTKEY:key] ESC/Enter/Tab/shift+tab/ctrl+~
		function onKeyDown(event){
			//是否是快捷键
			var isHotKey = false, keyCode = event.keyCode, positNode;
			switch (keyCode) {
				//如果是 “`”
				case KEY_WAVE:
					event.ctrlKey && _this.parentNode.openTypeMenu();
					isHotKey = true;
					break;
				//如果是 ESC
				case KEY_ESC:
					//获取父级焦点
					event.target.parentNode.focus();
					isHotKey = true;
					break;
				//如果是回车
				case KEY_ENTER:
					//获取下一节点
					positNode = _this.forward();
					//显示选择数据类型
					if (positNode === undefined) {
						_this.parentNode.openTypeMenu();
					}
					isHotKey = true;
					break;
				//如果是 tab 键
				case KEY_TAB:	//查找可编辑节点
					positNode = event.shiftKey ? _this.backward() : _this.forward();
					isHotKey = true;
					break;
			}
			//禁止冒泡
			event.stopPropagation();	//[禁止冒泡:keyElement.onkeydown]
			//如果是热键
			if (isHotKey) {
				//取消默认动作
				event.preventDefault();
				//如果需要定位节点
				positNode && positNode.focus();
				//返回
				return false;
			}
			return true;
		}
		// [EDITABLE:key.backward] 查找上一个可编辑的元素（可编辑的元素指：KEY/标量的VAR/复合变量的UL）
		this.backward = function () {
			var targetNode = _this.queryParent('LI'), siblingNode;
			// 是 LI
			while (targetNode) {
				// 上一个兄弟节点
				siblingNode = targetNode.previousSibling;
				if (siblingNode && siblingNode.tagName == 'LI'){
					return siblingNode.lastEditableNode();
				}
				// < UL < VAR
				targetNode = targetNode.queryParentAll('UL < VAR');
				if (!targetNode) {
					return null;
				}
				if (targetNode[targetNode.length - 1].isComplex()){
					return targetNode.shift();
				}
				//再往上获取上一级节点
				targetNode = targetNode.pop().queryParent('LI');
			}
			return null;
		};
		//[EDITABLE:key.forward] 查找下一个可编辑的元素（可编辑的元素指：KEY/标量的VAR/复合变量的UL）
		this.forward = function () {
			var target = _this.queryElement('+ SPAN + DL + VAR');
			if (!target){
				return undefined;
			}
			if (!target.isComplex()) {
				return target;
			}
			return target.queryElement('> CODE + UL');
		};
		//[REMOVE:keyElement]
		this.remove = function () {
			//注销事件
			_this.onkeydown = _this.onblur = _this.onclick = _this.onfocus = _this.onpaste = null;
			//删除节点
			_this.parentNode && _this.parentNode.removeChild(_this);
		};
		// [构造函数:keyElement]
		function __construct(_key){
			//继承baseElement
			baseElement.call(_this);
			//添加key
			_this.appendChild(document.createTextNode(string(_key)));
			// 分配节点ID
			_this.id = acquireId();
			// 添加 key 事件
			_this.onkeydown = onKeyDown;
			_this.onblur = onBlur;
			// WEBKIT 内核浏览器
			if (IS_WEBKIT) {
				// 解决 WEBKIT 内存浏览器对于 contentEditable 节点 onblur 事件存在BUG，重载 onclick、onfocus 和 onblur 事件
				_this.setAttribute(ATTR_TABINDEX, TAB_INDEX);
				_this.onclick = onFocus;
				_this.onfocus = onFocus;
			} else {
				_this.setAttribute('contentEditable', true);
				_this.onpaste = pasteContent;
			}
		}
		__construct(_key);
	}
	//派生于 baseElement
	baseElement.derive(keyElement);
	keyElement.instance = function (key) {
		var keyNode = nodeTemplate.key.cloneNode(true);
		keyElement.call(keyNode, key);
		return keyNode;
	};

	// -------------------- 数据类型列表节点 --------------------
	// [CLASS:typesElement]
	function typesElement(_type) {
		var _this = this, optionList, optionCount, activeOption, selectedType;
		function changeActive(useOption) {
			if (activeOption) {
				activeOption.className = activeOption.className.replace(/(^|\s+)active(?:\s+|$)/, "");
				activeOption = null;
			}
			if (useOption) {
				activeOption = useOption;
				activeOption.className += " active";
			}
		}
		function onMouseMove(event){
			var useOption = event.target;
			if (useOption && useOption.tagName == 'DD' && 
				activeOption && activeOption.getAttribute('data-value') == useOption.getAttribute('data-value')){
				return;
			}
			changeActive(useOption);
		}
		//[HOTKEY:dl] ESC/Enter/Up/Down
		function onKeyDown (event) {
			var isHotKey = false, keyCode = event.keyCode;
			switch (keyCode) {
				// 取消
				case KEY_ESC:
					var parentNode = _this.parentNode, positNode;
					if (parentNode && parentNode.tagName == 'LI') {
						positNode = parentNode.firstEditableNode();
						positNode && positNode.focus();
					}
					_this.hide();
					isHotKey = true;
					break;
				case KEY_ENTER:
					//改变数据类型
					changeDataType();
					//关闭菜单（必须在 changeDataType 之后才关闭）
					_this.hide();
					isHotKey = true;
					break;
				case KEY_UP:
				case KEY_DOWN:
					var upwardsKey = keyCode == KEY_UP,
						startOption = !activeOption ? optionList[0] : activeOption,
						siblingNode = upwardsKey ? startOption.previousSibling : startOption.nextSibling;
					if (!siblingNode) {
						siblingNode = optionList[upwardsKey ? optionCount - 1 : 0];
					}
					changeActive(siblingNode);
					isHotKey = true;
					break;
			}
			//禁止冒泡
			event.stopPropagation();	//[禁止冒泡:typesElement.onkeydown]
			//如果是热键
			if (isHotKey) {
				event.preventDefault();			//取消默认动作
				return false;					//返回
			}
			return true;
		}
		function onClick (event) {
			//更改数据类型
			changeDataType();
			//关闭菜单（必须在 changeDataType 之后才关闭）
			_this.hide();
			//禁止冒泡
			event.stopPropagation();		//[禁止冒泡:typesElement.onclick]
		}
		function changeDataType() {
			//是否是临时节点
			var siblNode = _this.varSibling(), positNode;
			//有选择类型
			if (activeOption) {
				var newType = activeOption.getAttribute('data-value');
				//类型有效且发生变换
				if (newType in DATA_TYPES && newType != selectedType) {
					selectedType = newType;
					var valNode = valueElement.instance(DATA_TYPES[selectedType].value);
					if (!siblNode) {
						_this.parentNode.appendChild(valNode);
						siblNode = _this.keySibling();
						positNode = siblNode ? siblNode : valNode;
					} else {
						_this.parentNode.replaceChild(valNode, siblNode);
						positNode = !valNode.isComplex() ? valNode : valNode.queryElement('>UL');
					}
				}
			}
			//未选择类型/类型无效/类型没有变化
			if (!positNode) {
				var parentNode = _this.parentNode;
				if (parentNode && parentNode.tagName == 'LI') {
					positNode = parentNode.firstEditableNode();
				}
			}
			if (positNode) {
				positNode.focus();
				return;
			}
		}
		function onBlur () {
			_this.style.display = 'none';
			var siblNode = _this.varSibling(), parentNode = _this.parentNode;
			// 是临时节点或者未创建 var 节点
			if (parentNode && !siblNode) {
				parentNode.parentNode.focus();	//UL 获得焦点
				parentNode.remove();			//删除节点
			}
		}
		this.keySibling = function () {
			var siblNode = _this.previousSibling;
			if (siblNode && siblNode.tagName == 'SPAN') {
				siblNode = siblNode.previousSibling;
				if (siblNode && siblNode.tagName == 'KEY') {return siblNode;}
			}
			return null;
		};
		this.varSibling = function () {
			var siblNode = _this.nextSibling;
			return siblNode && siblNode.tagName == 'VAR' ? siblNode : null;
		};
		this.hide = function () {
			_this.blur();
		};
		this.show = function () {
			// 计算合适的位置
			// >> 1. 移动到不可见的地方
			_this.style.marginTop = '-9999px';
			_this.style.marginLeft = '-9999px';
			// >> 2. 显示
			_this.style.display = 'block';
			// >> 3. 获取矩形对象
			var rect = _this.getBoundingClientRect(),
			// >> 5. 计算理想状态下的右、下边框位置
				rectRight = rect.right + 9999,
				rectBottom  = rect.bottom + 9999,
			// >> 4. 获取屏幕可视区域的实际大小
				clientWidth = parseInt(document.documentElement.clientWidth, 10),
				clientHeight= parseInt(document.documentElement.clientHeight, 10);
			
			// 前一节点、理想情况下 marginTop 和 marginLeft
			var siblNode = _this.keySibling(), marginTop = 0, marginLeft = 0;
			if (!siblNode) {
				marginTop = 4, marginLeft = 16;
			} else {
				marginTop = parseInt(siblNode.offsetHeight, 10) - 4, marginLeft = parseInt(siblNode.offsetWidth, 10) - 16;
			}
			//应用 margin 值
			_this.style.marginTop = (marginTop - Math.max(marginTop + rectBottom  - clientHeight, 0)) + 'px';
			_this.style.marginLeft = (marginLeft - Math.max(marginLeft + rectRight - clientWidth, 0)) + 'px';
			//初始化选项
			if (selectedType) {
				var i, useOption;
				for (i=0; i < optionCount; i++) {
					if (optionList[i].getAttribute('data-value') == selectedType) {
						useOption = optionList[i];
						break;
					}
				}
				changeActive(useOption);
			}
		};
		//[REMOVE:typesElement]
		this.remove = function () {
			//注销事件
			_this.onblur = _this.onclick = _this.onkeydown = _this.onmousemove = null;
			//删除子节点;
			for (var i = optionCount - 1; i > -1; i--) {_this.removeChild(optionList[i]);}
			//删除本身
			_this.parentNode && _this.parentNode.removeChild(_this);
		};
		//[构造函数:typesElement]
		function __construct(_type){
			//参数
			_type = string(_type);
			if (_type != "" && _type in DATA_TYPES) {
				selectedType = _type;
			}
			optionList = _this.childNodes;
			optionCount = optionList.length;
			// 添加 DL 事件
			_this.onblur = onBlur;
			_this.onclick = onClick;
			_this.onkeydown = onKeyDown;
			_this.onmousemove = onMouseMove;
		}
		__construct(_type);
	}
	typesElement.instance = function (_type) {
		var typesNode = nodeTemplate.typemenu.cloneNode(true);
		typesElement.call(typesNode, _type);
		return typesNode;
	};

	// -------------------- value节点 --------------------
	// [CLASS:valueElement]
	function valueElement(_data) {
		var _this = this, itemType, itemList, nodeBrackets = [];
		function onFocus(event) {
			_this.style.webkitUserModify = 'plaintext-only';
			if (event.button === undefined || event.type == 'focus') {
				window.getSelection().collapse(_this, 1);
			}
			return event && event.stopPropagation();	//[禁止冒泡:keyElement.onfocus]
		}
		function onBlur(event){
			_this.style.webkitUserModify = 'false';
		}
		//[HOTKEY:var] ESC/Enter/Tab/shift+tab/Up/ctrl+up/Down/ctrl+Down
		function onKeyDown(event){
			//是否是 hotkey
			var isHotKey = false, keyCode = event.keyCode, positNode;
			switch(keyCode) {
				// //如果是 “`”
				// case KEY_WAVE:
				// 	if (event.ctrlKey){
				// 		event.preventDefault();	//取消默认动作
				// 		return false;			//直接返回（事件冒泡）
				// 	}
				//获取父级焦点
				case KEY_ESC:
					event.target.parentNode.focus();
					isHotKey = true;
					break;
				//回车键
				case KEY_ENTER:
					if (itemType == 'string') {
						if (window.getSelection().anchorNode) {
							// 获取光标起始位置并插入回车符
							window.getSelection().getRangeAt(0).insertNode(
								nodeTemplate.newline.cloneNode(false)
							);
							isHotKey = true;
						}
					}
					else if (!_this.isComplex()){
						positNode = _this.forward();
						isHotKey = true;
					}
					break;
				// tab 键
				case KEY_TAB:
					//查找上一个/下一个可编辑节点
					positNode = event.shiftKey ? _this.backward() : _this.forward();
					isHotKey = true;
					break;
				//上下方向键
				case KEY_UP:
				case KEY_DOWN:
					if (itemType == 'boolean') {
						_this.innerHTML = _this.dataValue() ? 'false' : 'true';
						isHotKey = true;
					}
					break;
			}
			//禁止冒泡
			event.stopPropagation();	//[禁止冒泡:valueElement.itemList.itemUnit.onkeydown]
			//如果是快捷键
			if (isHotKey) {
				//取消默认动作
				event.preventDefault();
				//如果需要定位节点
				positNode && positNode.focus();
				//返回
				return false;
			}
			return true;
		}
		function onKeyUp(event) {
			if (itemType == 'number') {
				var hasInvalid = (" " + _this.className + " ").indexOf(" value-invalid ") != -1;
				if (!REG_NUMBER.test(_this.innerHTML)) {
					if (!hasInvalid) {_this.className += " value-invalid";}
				} else{
					if (hasInvalid) {_this.className = _this.className.replace(/(^|\s+)value\-invalid(?:\s+|$)/g, "");}
				}
			}
		}
		function onPaste(event) {
			pasteContent(event);
			onKeyUp(event);
		}
		//[HOTKEY:ul] ESC/Enter/Tab/shift+tab/shift+Del/Left/Right
		function onKeyDownItemList(event){
			//是否是 hotkey
			var isHotKey = false, keyCode = event.keyCode, positNode;
			switch(keyCode) {
				// ESC 键
				case KEY_ESC:
					positNode = _this.queryParent('LI');
					isHotKey = true;
					break;
				// del 键
				case KEY_DEL:
					if (event.shiftKey && _this.isComplex()) {
						var i, items = itemList.hasChildNodes() ? itemList.childNodes : [];
						for (i = items.length - 1; i > -1; i--) {
							items[i].remove();
						}
						isHotKey = true;
					}
					break;
				// tab 键
				case KEY_TAB:
					//查找上一个
					if (event.shiftKey) {
						positNode = _this.backward();
					//下一个可编辑节点
					} else {
						var itemNodes = _this.queryElement('> UL > LI');
						if (itemNodes){
							positNode = itemNodes.firstEditableNode();
						} else {
							var targetNode = _this.queryParent('LI'), siblingNode;
							while (targetNode){
								//相邻的下一个LI
								siblingNode = targetNode.queryElement('+ LI');
								if (siblingNode) {
									positNode = siblingNode.firstEditableNode();
									break;
								}
								//是本节点内最后一个 LI，那么就查找父级元素右边的兄弟元素......
								targetNode = targetNode.queryParent('UL < VAR < LI');
							}
						}
					}
					isHotKey = true;
					break;
				// enter 键
				case KEY_ENTER:
					if (itemList) {
						//先展开
						_this.unfold();
						//是否有子节点
						var hasChilds = itemList.hasChildNodes();
						// 没有 shift 键、ctrl 键，但是有子节点
						if (!event.shiftKey && !event.ctrlKey && hasChilds) {
							positNode = itemList.firstChild.firstEditableNode();
						// [INSERT-NEW-ROW]
						} else {
							var keyNode, typesNode, rowNode = rowElement.instance();
							//如果是对象类型则添加key
							if (itemType == 'object') {
								keyNode = keyElement.instance("");
								rowNode.appendChild(keyNode);
								rowNode.appendChild(nodeTemplate.colon.cloneNode(true));
							}
							//添加数据类型菜单
							typesNode = typesElement.instance();
							rowNode.appendChild(typesNode);
							// shift 键并且有子节点：插入到最前面
							if (event.shiftKey && hasChilds) {
								itemList.insertBefore(rowNode, itemList.firstChild);
							// 没有 shift 键（有 ctrl 键）或者没有子节点：插入到最后面
							} else {
								itemList.appendChild(rowNode);
							}
							//数据类型则显示菜单
							positNode = typesNode;
							positNode.show();
						}
					}
					isHotKey = true;
					break;
				// left 键
				case KEY_LEFT:
					_this.shrink();
					isHotKey = true;
					break;
				// right 键
				case KEY_RIGHT:
					_this.unfold();
					isHotKey = true;
					break;
			}
			//禁止冒泡
			event.stopPropagation();	//[禁止冒泡:valueElement.itemList.itemUnit.onclick]
			//如果是快捷键
			if (isHotKey) {
				//取消默认动作
				event.preventDefault();
				//如果需要定位节点
				positNode && positNode.focus();
				//返回
				return false;
			}
			return true;
		}
		function onClickItemList(event){
			_this.unfold();
			return event && event.stopPropagation();	//[禁止冒泡:valueElement.itemList.onclick]
		}
		function onClickBrackets(event) {
			itemList.focus();
			return event && event.stopPropagation();	//[禁止冒泡:valueElement.Brackets.onclick]
		}
		this.dataType = function () {
			return itemType;
		};
		this.dataValue = function () {
			var result, items;
			switch(itemType) {
				case 'null':
					return null;
				case 'boolean':
					return _this.innerHTML.replace(/(^\s+|\s+$)/g, "").toLowerCase() == 'true';
				case 'number':
					var mgrp = REG_NUMBER.exec(_this.innerHTML);
					if (mgrp) {
						/*
							1: 2
							2: 8
							3: 10
							4/5 float
							6: 科学
						*/
						if (mgrp[1] != null) {
							return parseInt(mgrp[0], 2);
						} else if (mgrp[2] != null) {
							return parseInt(mgrp[0], 8);
						} else if (mgrp[3] != null) {
							return mgrp[4] != null ||  mgrp[5] != null ? 
								parseInt(mgrp[0], 10) : parseFloat(mgrp[0], 10);
						} else if (mgrp[6] != null) {
							return parseFloat(mgrp[0], 10);
						}
					}
					// #TODO 可返回参数指定的值
					return 0;
				case 'string':
					return _this.innerHTML;
				case 'array':
					var i;
					result = [], items = _this.queryElementAll("UL > LI > VAR");
					for (i=0; i < items.length; i++) {
						result.push(items[i].dataValue());
					}
					return result;
				case 'object':
					var x, y, l;
					result = {}, items = _this.queryElementAll("UL > LI > KEY, UL > LI > VAR"), l = items.length;
					for (x = 0; x < l; x++) {
						y = x + 1;
						//符合条件，则获取元素，x 再递增 1；
						if (y < l && items[x].tagName == 'KEY' && items[y].tagName == 'VAR') {
							result[items[x].innerHTML] = items[y].dataValue();
							x = y;
						}
					}
					return result;
				default:
					return undefined;
			}
		};
		this.dataText = function () {
			return JSON.stringify(_this.dataValue(), null, '\t');
		};
		this.isComplex = function () {
			return itemType == 'array' || itemType == 'object' ? itemType : false;
		};
		this.unfold = function () {
			_this.className = _this.className.replace(/(^|\s+)shrink(?:\s+|$)/g, "");
		};
		this.shrink = function () {
			_this.className += " shrink";
		};
		//[EDITABLE:value.backward] 查找上一个可编辑的元素（可编辑的元素指：KEY/标量的VAR/复合变量的UL）
		this.backward = function () {
			var targetNode = _this.queryParent('LI'), siblingNode;
			if (targetNode.id in rootNodeList && ! targetNode.compareDocumentPosition(rootNodeList[targetNode.id])) {
				return targetNode;
			}
			while (targetNode) {
				//查找第一个元素(KEY)
				siblingNode = targetNode.queryElement('> KEY');
				if (siblingNode){
					return siblingNode;
				}
				//往上查找左边的兄弟元素(LI)
				siblingNode = targetNode.previousSibling;
				if (siblingNode && siblingNode.tagName == 'LI'){
					return siblingNode.lastEditableNode();
				}
				//如果没有左边的兄弟元素，往上查找两级父元素
				targetNode = targetNode.queryParentAll('UL < VAR');
				if (targetNode) {
					//上两级父元素（VAR）是复合类型，则返回上一级父元素（UL）
					if (targetNode[targetNode.length - 1].isComplex()) {
						return targetNode.shift();
					}
					//上两级父元素（VAR）不是复合类型
					targetNode = targetNode.pop().queryParent('LI');
				}
			}
			return null;
		};
		//[EDITABLE:value.forward] 查找下一个可编辑的元素（可编辑的元素指：KEY/标量的VAR/复合变量的UL）
		this.forward = function () {
			var targetNode, siblingNode;
			if (_this.isComplex() && itemList.hasChildNodes()) {
				targetNode = _this.queryElement('>UL');
				if (targetNode) {return targetNode;}
			}
			targetNode = _this.queryParent('LI');
			while (targetNode){
				//相邻的下一个LI
				siblingNode = targetNode.queryElement('+ LI');
				if (siblingNode) {
					return siblingNode.firstEditableNode();
				}
				//是本节点内最后一个 LI，那么就查找父级元素右边的兄弟元素......
				targetNode = targetNode.queryParent('UL < VAR < LI');
			}
			return null;
		};
		//[REMOVE:valueElement]
		this.remove = function () {
			if (!_this.isComplex()) {
				//注销事件
				_this.onclick = _this.onfocus = _this.onblur = _this.onpaste = _this.onkeyup = null;
			} else {
				//注销事件
				itemList.onkeydown = itemList.onclick = nodeBrackets[0].onclick = nodeBrackets[1].onclick = null;
				//删除子节点
				_this.removeChild(nodeBrackets[0]);
				var rows = itemList.childNodes, length = rows.length, i;
				for (i = length -1; i > -1; i--) {
					if (rows[i].tagName == 'LI') {
						rows[i].remove();
					} else {
						itemList.removeChild(rows[i]);
					}
				}
				_this.removeChild(itemList);
				_this.removeChild(nodeBrackets[1]);
				//注销变量
				itemList = null;
				nodeBrackets.splice(0, nodeBrackets.length);
			}
			//删除本身
			_this.parentNode && _this.parentNode.removeChild(_this);
		};
		//[构造函数:valueElement]
		function __construct(_data){
			//继承baseElement
			baseElement.call(_this);
			//确认数据类型
			var dataType = typeof(_data), brackets = null;
			switch (dataType) {
				case 'undefined':
					_data = dataType;
					break;
				case 'boolean':
					_data = _data ? 'true' : 'false';
					break;
				case 'number':
					_data = string(_data);
					break;
				case 'string':
					break;
				default:
					if (_data == null) {
						dataType = 'null', _data = dataType;
					} else if (isArray(_data)) {
						dataType = 'array', brackets = ['[', ']'];
					} else if (isPlainObject(_data)) {
						dataType = 'object', brackets = ['{', '}'];
					} else {
						dataType = 'string', _data = string(_data);
					}
					break;
			}
			//保存
			itemType = dataType;
			// 分配节点ID
			_this.id = acquireId();
			//改变 class 和添加自定义属性
			//>> 标量
			if (brackets == null) {
				_this.className = 'value-scalar value-' + itemType;
				_this.appendChild(document.createTextNode( _data));
				_this.setAttribute(ATTR_TABINDEX, TAB_INDEX);
				_this.onkeydown = onKeyDown;
				// 非 webkit
				if (dataType == 'number' || dataType == 'string') {
					// WEBKIT 内核浏览器
					if (IS_WEBKIT) {
						// 解决 WEBKIT 内存浏览器对于 contentEditable 节点 onblur 事件存在BUG，重载 onclick、onfocus 和 onblur 事件
						_this.onclick = onFocus;
						_this.onfocus = onFocus;
						_this.onblur = onBlur;
					} else {
						_this.setAttribute('contentEditable', true);
						_this.onpaste = pasteContent;
					}
					if (dataType == 'number') {
						_this.onpaste = onPaste;	//如果非 webkit 内核时，则覆盖原来的 onpaste 事件 
						_this.onkeyup = onKeyUp;
					}
				}
			//>> 复合变量
			} else {
				_this.className = 'value-' + itemType;
				nodeBrackets[0] = nodeTemplate.brackets.cloneNode(true);
				nodeBrackets[0].innerHTML = brackets[0];
				nodeBrackets[1] = nodeTemplate.brackets.cloneNode(true);
				nodeBrackets[1].innerHTML = brackets[1];
				nodeBrackets[1].className = 'bracket_right';
				//nodeBrackets[0].onmousedown = nodeBrackets[1].onmousedown = onMouseDownBrackets;
				nodeBrackets[0].onclick = nodeBrackets[1].onclick = onClickBrackets;
				itemList = dataType == 'array' ? arrayElement.instance(_data) : objectElement.instance(_data);
				itemList.onkeydown = onKeyDownItemList;
				itemList.onclick = onClickItemList;
				_this.appendChild(nodeBrackets[0]);
				_this.appendChild(itemList);
				_this.appendChild(nodeBrackets[1]);
			}
		}
		__construct(_data);
	}
	//派生于 baseElement
	baseElement.derive(valueElement);
	valueElement.instance = function (value) {
		var valNode = nodeTemplate.value.cloneNode(true);
		valueElement.call(valNode, value);
		return valNode;
	};

	// -------------------- array 列表节点(UL) --------------------
	function arrayElement(_data) {
		var _this = this;
		//[构造函数:arrayElement]
		function __construct(_data){
			var tmpRow, valNode, i, l = _data.length;
			for (i = 0; i < l; i++) {
				//【创建 li】
				tmpRow = rowElement.instance();
				//【创建 var】
				valNode = valueElement.instance(_data[i]);
				//【加入 dl】
				tmpRow.appendChild(typesElement.instance(valNode.dataType()));
				//【加入 var】
				tmpRow.appendChild(valNode);
				//【加入 li】
				_this.appendChild(tmpRow);
			}
		}
		__construct(_data);
	}
	arrayElement.instance = function (_data) {
		var listNode = nodeTemplate.list.cloneNode(true);
		arrayElement.call(listNode, _data);
		return listNode;
	};

	// -------------------- object 列表节点(UL) --------------------
	function objectElement(_data){
		var _this = this;
		//[构造函数:objectElement]
		function __construct(_data){
			var k, tmpRow, valNode;
			for (k in _data){
				//【创建 li】
				tmpRow = rowElement.instance();
				//【创建 key】
				tmpRow.appendChild(keyElement.instance(k));
				tmpRow.appendChild(nodeTemplate.colon.cloneNode(true));
				//【创建 var】
				valNode = valueElement.instance(_data[k]);
				tmpRow.appendChild(valNode);
				//【创建 dl】
				tmpRow.insertBefore(typesElement.instance(valNode.dataType()), valNode);
				//【插入 li】
				_this.appendChild(tmpRow);
			}
		}
		__construct(_data);
	}
	objectElement.instance = function (_data) {
		var listNode = nodeTemplate.list.cloneNode(true);
		objectElement.call(listNode, _data);
		return listNode;
	};

	function _jsonEditor(_container, _data,  _attrs) {
		var _this = this, editorElement, editorRoot, editorAttrs;
		// [构造函数:_jsonEditor]
		function __construct(_container, _data,  _attrs) {
			if (!isElement(_container)) {
				_container = document.getElementById(string(_container));
				if (!_container) {
					throw(
						["容器节点无效，创建编辑器失败。", "Container node not found, creation of editor failed."].join("\n")
					);
				}
			}
			//未加载样式表
			if (pubCssStyle) {
				var styleText = pubCssStyle.replace(/\{@prefix@\}/g, "UL." + CLASS_PREFIX + classRandom);
				addStyleSheet(styleText);
				pubCssStyle = null;
			}
			//保存属性
			editorAttrs = isPlainObject(_attrs) ? _attrs : {};
			//禁止IE自动生成链接
			IS_MSIE && document.execCommand("AutoUrlDetect", false, false);
			//创建根节点
			editorElement = nodeTemplate.outer.cloneNode(true);
			//导入数据
			_this.importing(_data);
			//添加数据节点
			editorElement.appendChild(editorRoot);
			//添加到容器中
			_container.appendChild(editorElement);
		}
		this.importing = function (_data) {
			//删除原来的
			editorRoot && isFunction(editorRoot.remove) && editorRoot.remove();
			//创建数据节点
			editorRoot = rowElement.instance();
			//设置属性
				//>> 热键
			var hotKey = string(editorAttrs.hotKey);
			hotKey != "" && /^[a-z]$/i.test(hotKey) && editorRoot.setAttribute('accessKey', hotKey);
				//>> 尺寸
			var i, name, match, sizeAttr = ['width', 'minWidth', 'height', 'minHeight'];
			for (i = 0; i < sizeAttr.length; i++) {
				name = sizeAttr[i];
				match = name in editorAttrs ? REG_SIZEATTR.exec(editorAttrs[name]) : null;
				if (match) {
					editorElement.style[name] = match[1] ? match[1] + 'px' : match[0];
				}
			}
				// overflow
			var overflow = string(editorAttrs.overflow);
			editorElement.style.overflow = overflow != "" ? overflow : 'auto';

			//创建数据 value 节点、types 节点
			var valueNode = valueElement.instance(_data),
				typesNode = typesElement.instance(valueNode.dataType());
			//添加 types 节点
			editorRoot.appendChild(typesNode);
			//添加 value 节点
			editorRoot.appendChild(valueNode);
			//将 editorRoot 记录到 rootNodeList
			rootNodeList[editorRoot.id] = editorRoot;
		};
		this.text = function () {
			var valNode = editorRoot.queryElement('>VAR');
			return valNode ? valNode.dataText() : null;
		};
		this.value = function () {
			var valNode = editorRoot.queryElement('>VAR');
			return valNode ? valNode.dataValue() : null;
		};
		__construct(_container, _data,  _attrs);
	}
	_jsonEditor.version = __VERSION__;
	_jsonEditor.author = __AUTHOR__;
	return _jsonEditor;
})();