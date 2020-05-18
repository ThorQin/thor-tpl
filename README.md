# thor-tpl

### Description
A simple JS template engine.

### Installation

```
npm i thor-tpl
```

### Usage

> #### Rendering synchronously

```javascript
import { render } from 'thor-tpl';

const template = `
{{@arg name, messages}}
One day I met {{name}}:
{{@loop idx:msg of messages}}
{{@if idx%2==0}}I:{{@else}}Bob:{{@end if}} {{@unsafe msg}}
{{@end loop}}
`;

const data = {
  name: 'Bob',
  messages: [
    'How are you?',
    'Fine thank you and you?',
    'I\'m fine too.'
  ]
};

console.log(render(template, data));

```

> #### Rendering asynchronously

```javascript
import { renderAsync } from 'thor-tpl';

const template = `
{{@arg name, messages}}
One day I met {{name}}:
{{@loop idx:msg of messages}}
{{@if idx%2==0}}I:{{@else}}Bob:{{@end if}} {{@unsafe msg}}
{{@end loop}}
`;

const data = {
  name: 'Bob',
  messages: [
    'How are you?',
    'Fine thank you and you?',
    'I\'m fine too.'
  ]
};

(async function () {
  let result = await renderAsync(template, data)
  console.log(result);
})();


```

> #### Extend template function

```javascript
import { renderAsync } from 'thor-tpl';

const template = `
{{@fn range}}
{{@loop idx of range(10)}}
{{@unsafe idx}}
{{@end loop}}
`;

const options = {
  trace: (fn) => { // If you will debug generated function, you can write function code to file.
    console.log(fn.toString())
  },
  fn: { // Custom function write here
    range: (max) => {
      max = max || 0;
      var arr = [];
      for (let i = 0; i < max; i++) {
        arr.push(i);
      }
      return arr;
    }
  }
};

(async function () {
  let result = await renderAsync(template, {}, options)
  console.log(result);
})();
```

> #### Compile once render multiple times

```javascript
import { render, compile } from 'thor-tpl';

const template = `{{@arg msg}}{{msg}}`;
let fn = compile(template);

for (let i = 0; i < 3; i++) {
  let result = render(fn, {msg: 'Hello World!'});
  console.log(result);
}

```

### Complete example

You can see project [thor-web](https://gitee.com/thor.qin/thor-web)'s source code to understand how to use this library.


That's all.
