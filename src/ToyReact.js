// 深拷贝
const merge = (oldState, newState) => {
  for (let prop in newState) {
    if (typeof newState[prop] === "object" && newState[prop] !== null) {
      if (typeof oldState[prop] !== "object") {
        oldState[prop] = newState[prop] instanceof Array ? [] : {};
      }
      merge(oldState[prop], newState[prop]);
    } else {
      oldState[prop] = newState[prop];
    }
  }
};

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

// 内置 ElementWrapper
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

// 内置 TextWrapper
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

// 公共继承类 Component
export class Component {
  constructor() {
    this.isMounted = false;
    this.children = [];
    this.props = Object.create(null);
  }
  get type() {
    return this.constructor.name;
  }
  get vdom() {
    return this.render().vdom;
  }
  // 用作生命周期钩子回调
  _callLifeCircle(name, ...args) {
    const cb = this[name];
    if (typeof cb === "function") {
      return cb.apply(this, args);
    }

    return true;
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
          // 当 child 为空时
          if (child === null || child === void 0) child = "";

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
