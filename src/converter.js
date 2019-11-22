const ERROR_MSG = 'Provided template is invalid';

function camelize(str) {
    if (typeof str === 'string') {
        const newStr = str.split('-').map(s => (s.charAt(0).toUpperCase() + s.substring(1))).join('');
        return (newStr.charAt(0).toLowerCase() + newStr.substring(1));
    }
    return '';
}

function replaceFn(match, content) {
    if (content.trim().indexOf('{') > -1) {
        // HTML context to be resolved in second iteration
        return match;
    }
    const contentParts = content.trim().split(' ').filter(parts => !!parts);
    if (contentParts.length === 0) {
        throw new Error(ERROR_MSG);
    }
    if (contentParts[0].startsWith('>')) {
        // It's an import statement
        if (contentParts.length === 1) {
            const importPath = contentParts[0].substring(1);
            if (importPath.trim().length) {
                return `<hbs-import data-path="${importPath}" data-template="${camelize(importPath.substring(importPath.lastIndexOf('/') + 1))}"/>`;
            }
            throw new Error(ERROR_MSG);
        }
        if (contentParts.length >= 2) {
            let returnTag = '';
            if (contentParts[0] === '>') {
                returnTag = `<hbs-import data-path="${contentParts[1]}" data-template="${camelize(contentParts[1].substring(contentParts[1].lastIndexOf('/') + 1))}"`;
                contentParts.slice(2).forEach((part, index) => {
                    returnTag += ` data-$${index}="${encodeURIComponent(part)}"`;
                });
                returnTag += '/>';
                return returnTag;
            }
            // Some data is passed
            const importPath = contentParts[0].substring(1);
            if (importPath.trim().length) {
                returnTag = `<hbs-import data-path="${importPath}" data-template="${camelize(importPath.substring(importPath.lastIndexOf('/') + 1))}"`;
                contentParts.slice(1).forEach((part, index) => {
                    returnTag += ` data-$${index}="${encodeURIComponent(part)}"`;
                });
                returnTag += '/>';
                return returnTag;
            }
            throw new Error(ERROR_MSG);
        }
    }
    if (contentParts.length === 1) {
        // It can be a closing tag
        if (contentParts[0].startsWith('/')) {
            return `</hbs-${contentParts[0].substring(1)}>`;
        }
        // Otherwise it is just a rendered content
        return `<hbs-render data-text="${contentParts[0]}"${this.context === 'html' ? ' context="html"' : ''}/>`; // Replacing with self closing tag
    }
    if (contentParts.length > 1) {
        if (contentParts[0].startsWith('/')) {
            // It is an ending tag with unnecessary attributes
            throw new Error(ERROR_MSG);
        }
        let startingToken = `<hbs-${contentParts[0]}`;
        let closingToken = '/>';
        if (contentParts[0].startsWith('#')) {
            // It means that given expression has a separate closing tag
            startingToken = `<hbs-${contentParts[0].substring(1)}`;
            closingToken = '>';
        }
        const remainingItems = contentParts.slice(1);
        let returnTag = startingToken;
        const attributes = remainingItems.map((item, index) => {
            return `data-$${index}="${encodeURIComponent(item)}"`;
        });
        if (this.context === 'html') {
            attributes.push('context="html"');
        }
        returnTag += ` ${attributes.join(' ')}${closingToken}`;
        return returnTag;
    }
    return match;
}

function sanitize(...args) {
    const [, p1, p2, p3, p4] = args;
    return p1 + p2.replace(/'|"/, '\'') + p3 + p4.replace(/'|"/, '\'');
}

module.exports = function (htmlString) {
    htmlString = htmlString.replace(/(\=)("|')({{{[^}]+}}})("|')/g, sanitize);
    htmlString = htmlString.replace(/(\=)("|')({{[^}]+}})("|')/g, sanitize);
    return htmlString.replace(/{{([^}]+)}}/g, replaceFn).replace(/{{{([^}]+)}}}/g, replaceFn.bind({ context: 'html' }));
};