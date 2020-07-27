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

// 内置 TextWrapper
class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text);
  }
  mountTo(parent) {
    parent.appendChild(this.root);
  }
}

// 公共继承类 Component
export class Component {
  constructor() {
    this.children = [];
  }
  setAttribute(name, value) {
    this[name] = value;
  }
  mountTo(parent) {
    const vdom = this.render();
    vdom.mountTo(parent);
  }
  appendChild(vChild) {
    this.children.push(vChild);
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
