## toy-react

> 实现简单版本的 react，了解 react 基本原理
>
> 1. 支持 react jsx 语法；
> 2. 实现 setState 节点更新；
> 3. 添加生命周期钩子；
> 4. 切换为虚拟 dom 进行操作；

### 环境配置

#### 构建功能点

> 需要基于 webpack/webpack-dev-server
>
> 1. 需要使用 `babel` 进行语法转换；
> 2. 需要使用 `@babel/plugin-transform-react-jsx` 进行 jsx 语法解析，使用其内置参数 `pragma` 自定义 `createElement` 别名；
> 3. 需要使用 webpack-dev-server 特性，动态监听更新，快速更进调试；

#### 具体配置

```javascript
module.exports = {
  // 入口配置
  entry: {
    index: "./src/index.js",
  },
  devServer: {
    // 动态监听目录
    contentBase: "./src/",
    compress: false,
    port: 9000,
  },
  mode: "development",
  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [
              [
                "@babel/plugin-transform-react-jsx",
                { pragma: "ToyReact.createElement" },
              ],
            ],
          },
        },
      },
    ],
  },
};
```

#### 命令配置

> 1. package.json scripts 中加入启动命令；
> 2. 使用 `npm run dev` 启动项目；

```json
{
  "scripts": {
    "dev": "webpack-dev-server --client-log-level silent --color"
  }
}
```

### 1. JSX 的原理和关键实现

#### 实现模板

> 1. 实现 jsx 解析；
> 2. 实现 jsx dom 节点解析；
> 3. 实现 ToyReact.render 函数；
> 4. 实现公共继承类 Component;

```javascript
import { ToyReact, Component } from "./ToyReact";

class MyComponent extends Component {
  render() {
    console.log(this.children);
    return (
      <div name="a">
        hello toy react
        <span> abcd</span>
        {this.children}
        <div>{true}</div>
      </div>
    );
  }
}

const App = (
  <MyComponent name="a">
    <div>children</div>
  </MyComponent>
);

ToyReact.render(App, document.body);
```

#### 实现 ToyReact 公共方法

> 1. 实现 createElement 核心逻辑；
> 2. 实现 render 钩子

```javascript
export const ToyReact = {
  createElement(type, attributes, ...children) {
    let element;
    if (typeof type === "string") {
      // 内置 ElementWrapper 对象
      element = new ElementWrapper(type, attributes);
    } else {
      // 外部继承对象，这里的 type 对象默认认为它继承了 Component
      element = new type();
    }

    // 属性处理
    for (let name in attributes) {
      // setAttribute
      // element 可能为 ElementWrapper 或者 继承自 Component 的实例
      // 这里分别调用它们的实现方法 setAttribute
      element.setAttribute(name, attributes);
    }

    // children 递归插入
    const insertChildren = (children) => {
      for (let child of children) {
        if (typeof child === "object" && child instanceof Array) {
          insertChildren(child);
        } else {
          // 当 child 没有继承于内置对象时，做一次安全处理，统一转 String
          if (
            !(child instanceof Component) &&
            !(child instanceof ElementWrapper) &&
            !(child instanceof TextWrapper)
          )
            child = String(child);

          // 文本节点创建
          if (typeof child === "string") child = new TextWrapper(child);

          // appendChild
          // element 可能为 ElementWrapper 或者 继承自 Component 的实例
          // 这里分别调用它们的实现方法 appendChild
          element.appendChild(child);
        }
      }
    };

    insertChildren(children);

    return element;
  },
  // render 钩子
  render(vdom, element) {
    vdom.mountTo(element);
  },
};
```

#### `ElementWrapper` 元素节点类

> 公共元素类，实现元素节点处理逻辑：
>
> 1. 实现构造函数，元素创建，最终还是基于 dom.createElement;
> 2. 实现 setAttribute;
> 3. 实现 appendChild;
> 4. 实现 mountTo 函数；

```javascript
// 内置 ElementWrapper
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(name, value) {
    this.root.setAttribute(name, value);
  }
  appendChild(vChild) {
    vChild.mountTo(this.root);
  }
  mountTo(parent) {
    parent.appendChild(this.root);
  }
}
```

#### `TextWrapper` 文本节点类

> 公共节点类，实现文本节点处理逻辑：
>
> 1. 实现构造函数，文本节点创建，最终还是基于 dom.createTextNode;
> 2. 实现 mountTo 函数

```javascript
// 内置 TextWrapper
class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text);
  }
  mountTo(parent) {
    parent.appendChild(this.root);
  }
}
```

#### `Component` 公共继承类

> 1. 实现构造函数，子组件收集，统一处理;
> 2. 实现 setAttribute;
> 3. 实现 appendChild;
> 4. 实现 mountTo 函数，默认 this.render 返回 vdom（即 creaElement 返回的对象）；

```javascript
// 公共继承类 Component
export class Component {
  constructor() {
    this.children = [];
  }
  setAttribute(name, value) {
    this[name] = value;
  }
  appendChild(vChild) {
    this.children.push(vChild);
  }
  mountTo(parent) {
    const vdom = this.render();
    vdom.mountTo(parent);
  }
}
```

### 2. 添加生命周期

#### 实现模板

> 1. 支持 props;
> 2. 支持 onClick 事件监听；
> 3. 支持 setState;
> 4. 生命周期钩子埋点；

```javascript
import { ToyReact, Component } from "./ToyReact";

class Square extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
    };
  }

  componentWillMount() {
    console.log("componentWillMount");
  }

  componentDidUpdate() {
    console.log("componentDidUpdate");
  }

  componentWillReceiveProps(oldState, newState) {
    console.log("componentWillReceiveProps", oldState, newState);
  }

  shouldComponentUpdate(oldState, newState) {
    console.log("shouldComponentUpdate", oldState, newState);
    return oldState.value !== newState.value;
  }

  render() {
    return (
      <button className="square" onClick={() => this.setState({ value: "X" })}>
        {this.state.value || this.props.value}
      </button>
    );
  }
}

class Board extends Component {
  renderSquare(i) {
    return <Square value={i} />;
  }

  render() {
    return (
      <div>
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}

const App = <Board />;

ToyReact.render(App, document.body);
```

#### 改造 `ToyReact.render`

> 1. 增加 [Range](https://developer.mozilla.org/zh-CN/docs/Web/API/Range) 用来记录节点位置，方便处理更新；
> 2. mountTo 统一使用 range

```javascript
export const ToyReact = {
  createElement(type, attributes, ...children) {
    // ...
  },
  // render 钩子
  render(vdom, element) {
    // range 记录节点位置
    const range = document.createRange();

    // 有子节点则追加
    if (element.children.length) {
      range.setStartAfter(element.lastChild);
      range.setEndAfter(element.lastChild);
    } else {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    }

    vdom.mountTo(range);
  },
};
```

#### 改造 `ElementWrapper`

> 1. appendChild 采用 range 处理；
> 2. mountTo 采用 range 处理；
> 3. 增加事件监听；

```javascript
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(name, value) {
    if (name.match(/^on([\s\S]+)$/)) {
      // 事件监听处理
      const evtName = RegExp.$1.toLowerCase();
      this.root.addEventListener(evtName, value);
    } else {
      // className 处理
      if (name === "className") name = "class";

      this.root.setAttribute(name, value);
    }
  }
  appendChild(vChild) {
    const range = document.createRange();

    if (this.root.children.length) {
      // 如果有子元素，则添加在最后
      range.setStartAfter(this.root.lastChild);
      range.setEndAfter(this.root.lastChild);
    } else {
      range.setStart(this.root, 0);
      range.setEnd(this.root, 0);
    }

    vChild.mountTo(range);
  }
  mountTo(range) {
    // 先清除
    range.deleteContents();
    // 再插入
    range.insertNode(this.root);
  }
}
```

#### 改造 `TextWrapper`

> 1. mountTo 采用 range 处理

```javascript
class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text);
  }
  mountTo(range) {
    // 先清除
    range.deleteContents();
    // 再插入
    range.insertNode(this.root);
  }
}
```

#### 改造 `Component` 公共类

> 1. 引入 props;
> 2. mountTo 使用 range;
> 3. 增加 update 方法；
> 4. 增加 setState 方法；
> 5. 增加 生命周期钩子；
> 6. 增加深拷贝公共方法；

##### 深拷贝

```javascript
// 深拷贝
const merge = (oldState, newState) => {
  for (let prop in newState) {
    if (typeof newState[prop] === "object") {
      if (typeof oldState[prop] !== "object") {
        oldState[prop] = {};
      }
      merge(oldState[prop], newState[prop]);
    } else {
      oldState[prop] = newState[prop];
    }
  }
};
```

##### `Component` 公共类

```javascript
export class Component {
  constructor() {
    this.isMounted = false;
    this.children = [];
    this.props = Object.create(null);
  }
  // 用作生命周期钩子回调
  _callLifeCircle(name, ...args) {
    const cb = this[name];
    if (typeof cb === "function") {
      return cb.apply(this, args);
    }
  }
  // 记录属性以及 props
  setAttribute(name, value) {
    this[name] = value;
    this.props[name] = value;
  }
  mountTo(range) {
    // componentWillMount
    this._callLifeCircle("componentWillMount");

    this.range = range;
    this.update();

    // 是否挂载过
    this.isMounted = true;

    // componentDidMount
    this._callLifeCircle("componentDidMount");
  }
  update() {
    // componentWillUpdate
    // 挂载过则执行更新钩子
    this.isMounted && this._callLifeCircle("componentWillUpdate");

    // 更新之前当前位置先插入一个注释占位
    const range = document.createRange();
    range.setStart(this.range.endContainer, this.range.endOffset);
    range.setEnd(this.range.endContainer, this.range.endOffset);
    range.insertNode(document.createComment("placeholder"));

    // 再清除当前节点
    this.range.deleteContents();

    const vdom = this.render();
    // 最后 mount
    vdom.mountTo(this.range);

    // componentDidUpdate
    this.isMounted && this._callLifeCircle("componentDidUpdate");
  }
  appendChild(vChild) {
    this.children.push(vChild);
  }
  setState(state) {
    // shouldComponentUpdate
    // 更新之前检测是否中断更新
    if (!this._callLifeCircle("shouldComponentUpdate", this.state, state)) {
      return;
    }

    // componentWillReceiveProps
    this._callLifeCircle("componentWillReceiveProps", this.state, state);

    if (!this.state && state) this.state = {};

    // 合并 state，这里使用深拷贝
    merge(this.state, state);

    // 更新
    this.update();
  }
}
```

### 3. 切换虚拟 dom

#### 改造 `ElementWrapper`

> 1. 引入 vdom，指向自己，以当前对象为 vdom；
> 2. 改造 setAttribute/appendChild 为虚拟操作，缓存属性和子节点；
> 3. 改造 mountTo，此方法处理真实 dom，即节点创建、属性、事件处理等；

```javascript
class ElementWrapper {
  constructor(type) {
    this.type = type;
    this.children = [];
    this.props = Object.create(null);
  }
  get vdom() {
    return this;
  }
  get element() {
    return this.root;
  }
  setAttribute(name, value) {
    this.props[name] = value;
  }
  appendChild(vChild) {
    this.children.push(vChild);
  }
  mountTo(range) {
    // 先清除
    range.deleteContents();

    this.range = range;

    const element = document.createElement(this.type);

    for (let name in this.props) {
      const value = this.props[name];

      if (name.match(/^on([\s\S]+)$/)) {
        // 事件监听处理
        const evtName = RegExp.$1.toLowerCase();
        element.addEventListener(evtName, value);
      } else {
        // className 处理
        if (name === "className") name = "class";

        element.setAttribute(name, value);
      }
    }

    for (let child of this.children) {
      const range = document.createRange();
      if (element.children.length) {
        // 如果有子元素，则添加在最后
        range.setStartAfter(element.lastChild);
        range.setEndAfter(element.lastChild);
      } else {
        range.setStart(element, 0);
        range.setEnd(element, 0);
      }
      child.mountTo(range);
    }

    range.insertNode(element);
  }
}
```

#### 改造 `TextWrapper`

> 1. 引入 vdom，指向自己，以当前对象为 vdom；
> 2. mountTo 处理真实节点

```javascript
class TextWrapper {
  constructor(text) {
    this.type = "#text";
    this.root = document.createTextNode(text);
    this.children = [];
    this.props = Object.create(null);
  }
  get vdom() {
    return this;
  }
  mountTo(range) {
    this.range = range;
    // 先清除
    range.deleteContents();
    // 再插入
    range.insertNode(this.root);
  }
}
```

#### 改造 `Component`

> 1. 引入 `vdom: this.render().vdom`；
> 2. 改造 `update`，这里做节点比较，合理更新节点；

##### `isSameNode` 虚拟节点比较

```javascript
// same node 比较
const isSameNode = (node1, node2) => {
  if (!node1 || !node2) return false;

  // 标签不一致
  if (node1.type !== node2.type) {
    return false;
  }

  // 属性长度不一致
  if (Object.keys(node1.props).length !== Object.keys(node2.props).length)
    return false;

  // 属性有一个不一致
  for (let name in node1.props) {
    // 属性为方法时
    if (
      typeof node1.props[name] === "function" &&
      typeof node2.props[name] === "function" &&
      node1.props[name].toString() === node2.props[name].toString()
    )
      continue;

    // 属性为对象时
    if (
      typeof node1.props[name] === "object" &&
      typeof node2.props[name] === "object" &&
      JSON.stringify(node1.props[name]) === JSON.stringify(node2.props[name])
    )
      continue;

    // 属性名称不相等
    if (node1.props[name] !== node2.props[name]) return false;
  }

  return true;
};
```

##### `isSameTree` 虚拟节点树比较

```javascript
// same tree 比较
const isSameTree = (node1, node2) => {
  // 标签不一致
  if (!isSameNode(node1, node2)) return false;

  // 子节点长度不一致
  if (node1.children.length !== node2.children.length) return false;

  for (let i = 0; i < node1.children.length; i++) {
    if (!isSameTree(node1.children[i], node2.children[i])) return false;
  }

  return true;
};
```

##### `replaceNode` 虚拟节点替换

```javascript
let lastRange = null;
// 替换节点
const replaceNode = (newTree, oldTree) => {
  // 当子节点比较时一方为空时，这时候需要补充节点
  if (!oldTree && lastRange) {
    lastRange.setStartAfter(lastRange.endContainer.lastChild);
    lastRange.setEndAfter(lastRange.endContainer.lastChild);
    newTree.mountTo(lastRange);
    return;
  }

  if (isSameTree(newTree, oldTree)) return;

  if (!isSameNode(newTree, oldTree)) {
    newTree.mountTo(oldTree.range);
  } else {
    for (let i = 0; i < newTree.children.length; i++) {
      // 记录当前子节点遍历的最后一次 range
      lastRange = oldTree.children[i] ? oldTree.children[i].range : lastRange;
      replaceNode(newTree.children[i], oldTree.children[i]);
    }
    // 清理标记
    lastRange = null;
  }
};
```

##### `Component` 改动

```javascript
export class Component {
  // ... 原来逻辑
  get type() {
    return this.constructor.name;
  }
  get vdom() {
    return this.render().vdom;
  }
  // ... 原来逻辑
  update() {
    // componentWillUpdate
    // 挂载过则执行更新钩子
    this.isMounted && this._callLifeCircle("componentWillUpdate");

    const vdom = this.render();

    if (this.oldVDom) {
      // 更新
      if (isSameTree(vdom, this.oldVDom)) return;

      if (!isSameNode(vdom, this.oldVDom)) {
        // componentDidUnmount
        this._callLifeCircle("componentDidUnmount");
        vdom.mountTo(this.range);
      } else {
        replaceNode(vdom, this.oldVDom);
      }
    } else {
      // 最后 mount
      vdom.mountTo(this.range);
    }

    this.oldVDom = vdom;

    // componentDidUpdate
    this.isMounted && this._callLifeCircle("componentDidUpdate");
  }
  // ... 原来逻辑
}
```
