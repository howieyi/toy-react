## toy-react

> 实现简单版本的 react

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
  entry: {
    index: "./src/index.js",
  },
  devServer: {
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

### JSX 的原理和关键实现

#### 实现目标

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

#### 实现 ToyReact

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

#### ElementWrapper

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

#### TextWrapper

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

#### Component

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
