# hbs2htl
Converts handlebar templates to HTL (sightly)

# How to use?

## Install

```sh
npm install --save hbs2htl
```

## Import

```js
const Hbs2htl = require('hbs2htl');
```

## Compile

```js
const hbs2htl = new Hbs2htl(`
<div>
    {{#if this}}
        {{this.prop}}
    {{/if}}
</div>`, { 
    template: 'mySightlyTemplate'
});
console.log(hbs2htl.html); // Compatible HTL template
/**
 * Output:
 * 
 * <sly data-sly-template.mySightlyTemplate="${@ data}">
 *     <div>
 *         <sly data-sly-test="${data}">
 *             ${data.prop}
 *         </sly>
 *     </div>
 * </sly>
 */
```

## Compiling unknown expressions

You can write your own transformations to compile unkown expressions. This is useful if you are using custom helpers.

Handlebars:

```hbs
{{#eachCustom this}}
   {{this}}
{{/eachCustom}}
```

Default output:

```html
<hbs-eachCustom data-$0="this">
  ${data}
</hbs-eachCustom>
```

To transform this you can use ``transform`` function.

```js
console.log((new Hbs2htl(hbsText, {
    transform({ tag, props, event }) {
        if (event === 'onopentag') {
            return '...';
        }
        if (event === 'onclosetag') {
            return '</...>';
        }
    }
})).html);
```

Transform function is called only for unknown handlebar expressions.

# DISCLAIMER

This package is still in a very early stage and is extremely buggy. Don't use this package in production yet. Your contributions are welcome! Help us improve this project.