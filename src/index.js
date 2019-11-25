
const converter = require('./converter');
const CreateDom = require('./createDom');

module.exports = class Hbs2htl {
    constructor(text, options = { template: 'out' }) {
        this.options = Object.freeze(options);
        this.dom = new CreateDom(converter(text), options);
        this.html = this.dom.getTemplate(options.template);
    }
    html() {
        return this.dom.html();
    }
}