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

// 内置 ElementWrapper
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

// 内置 TextWrapper
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

// 公共继承类 Component
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
      element.setAttribute(name, attributes[name]);
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
