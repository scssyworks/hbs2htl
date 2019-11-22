const htmlParser = require('htmlparser2');
const TagStack = require('./tagStack');

const ERROR_MSG = 'Some problem occurred while parsing handlebar template.';

module.exports = class CreateDom {
    constructor(htmlString, resolveToData, contextualTags) {
        this.importCounter = 0;
        this.contextualTags = contextualTags || new TagStack();
        this.newText = '';
        const firstLevelRef = ['data'];
        this.firstLevelRef = firstLevelRef;
        const parser = new htmlParser.Parser({
            onopentag: (tag, props) => {
                if (tag === 'hbs-render') {
                    this.newText += this.getRenderingElement(props, 'data-text', firstLevelRef, resolveToData);
                } else if (tag === 'hbs-if') {
                    let slyTag = '<sly';
                    const exprKeys = Object.keys(props);
                    if (exprKeys.length > 1) {
                        throw new Error(ERROR_MSG);
                    }
                    exprKeys.forEach(key => {
                        slyTag += ` data-sly-test="${this.getRenderingElement(props, key, firstLevelRef, resolveToData)}"`;
                    });
                    slyTag += '>';
                    this.newText += slyTag;
                } else if (tag === 'hbs-each') {
                    const contextRef = `list${this.contextualTags.length}`;
                    let slyTag = '<sly';
                    const exprKeys = Object.keys(props);
                    if (exprKeys.length > 1) {
                        throw new Error(ERROR_MSG);
                    }
                    exprKeys.forEach(key => {
                        slyTag += ` data-sly-list.${contextRef}="${this.getRenderingElement(props, key, firstLevelRef, resolveToData)}"`;
                    });
                    slyTag += '>';
                    this.newText += slyTag;
                    this.contextualTags.push({ tag, contextRef });
                } else if (tag === 'hbs-import') {
                    const refs = [];
                    const assignments = [];
                    Object.keys(props).filter(key => !['data-path', 'data-template'].includes(key)).forEach(key => {
                        const currentValue = decodeURIComponent(props[key]).trim();
                        const [v, assignable] = currentValue.split('=');
                        if (assignable) {
                            assignments.push({ v, assignable });
                        } else {
                            refs.push(currentValue);
                        }
                        if (refs.length > 1) {
                            throw new Error(ERROR_MSG);
                        }
                    });
                    const params = refs.map(ref => `data=${this.getRenderedKey(ref, firstLevelRef, resolveToData)}`);
                    assignments.forEach(({ v, assignable }) => {
                        if (assignable.startsWith('"') || assignable.startsWith('\'')) {
                            params.push(`${v}=${assignable}`);
                        } else {
                            params.push(`${v}=${this.getRenderedKey(assignable, firstLevelRef, resolveToData)}`);
                        }
                    });
                    let slyTag = '<sly';
                    slyTag += ` data-sly-use.module${this.importCounter}="${props['data-path']}"`;
                    slyTag += ` data-sly-call="$\{module${this.importCounter++}.${props['data-template']} @ ${
                        params.join(',')
                        }\}">`;
                    this.newText += slyTag;
                } else {
                    const attr = (Object.keys(props).map(key => {
                        let value = decodeURIComponent(props[key]).trim();
                        if (value.startsWith('<')) {
                            value = (new CreateDom(value, resolveToData, this.contextualTags)).html();
                        }
                        return `${key}="${value}"`;
                    }).join(' ')).trim();
                    this.newText += `<${tag}${attr.length ? ` ${attr}` : ''}>`;
                }
            },
            onclosetag: tag => {
                if (['hbs-if', 'hbs-each', 'hbs-import'].includes(tag)) {
                    if (tag === 'hbs-each') {
                        this.contextualTags.pop();
                    }
                    this.newText += '</sly>';
                } else if (!['hbs-render'].includes(tag)) {
                    this.newText += `</${tag}>`;
                }
            },
            ontext: text => {
                this.newText += text;
            }
        }, {
            xmlMode: true,
            recognizeSelfClosing: true
        });
        parser.write(htmlString);
        parser.end();
    }
    html() {
        return this.newText;
    }
    getTemplate(templateName) {
        return `<sly data-sly-template.${templateName}="$\{@ ${this.firstLevelRef.join(',')}\}">
            ${this.html()}
        </sly>`;
    }
    getRenderedKey(renderedKey, firstLevelRef, resolveToData) {
        let rootRef = 'data';
        if (this.contextualTags.length > 0) {
            let topIndex = 0;
            if (renderedKey.includes('@root')) {
                if (renderedKey.startsWith('@root.')) {
                    renderedKey = renderedKey.replace('@root.', `${rootRef}.`);
                }
                if (renderedKey === '@root') {
                    renderedKey = rootRef;
                }
            } else {
                let hasSubProp = renderedKey.startsWith('@');
                if (hasSubProp) {
                    renderedKey = renderedKey.substring(1);
                }
                while (renderedKey.indexOf('../') === 0) {
                    topIndex += 1;
                    renderedKey = renderedKey.substring(3);
                }
                const referredContext = this.contextualTags.item(topIndex);
                if (referredContext && referredContext.contextRef) {
                    rootRef = `${referredContext.contextRef}${hasSubProp ? 'Item' : ''}`;
                }
            }
        }
        return this.handleThis(renderedKey, firstLevelRef, resolveToData, rootRef);
    }
    getRenderingVar(props, key, firstLevelRef, resolveToData) {
        let renderedKey = decodeURIComponent(props[key]).trim();
        return this.getRenderedKey(renderedKey, firstLevelRef, resolveToData);
    }
    getRenderingElement(props, ...args) {
        return `$\{${this.getRenderingVar(props, ...args)}${props.context ? ` @ context='${props.context}'` : ''}\}`;
    }
    handleThis(text, firstLevelRef, resolveToData, rootRef = 'data') {
        if (text.startsWith('this.')) {
            text = `${rootRef}.${text.substring('this.'.length)}`;
        }
        if (text === 'this') {
            text = rootRef;
        }
        if (!resolveToData) {
            const dataParts = text.split('.');
            if (dataParts.length > 1) {
                if (!firstLevelRef.includes(dataParts[0]) && dataParts[0] !== rootRef) {
                    firstLevelRef.push(dataParts[0]);
                }
                return text;
            }
        }
        if (firstLevelRef.includes(text) || text === rootRef) {
            return text;
        }
        return `${rootRef}.${text}`;
    }
}