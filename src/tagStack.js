module.exports = class TagStack {
    constructor(existing) {
        this.list = [];
        if (Array.isArray(existing) && existing.length) {
            this.list.push(...existing);
        }
        this.length = this.list.length;
    }
    push(item) {
        if (item
            && typeof item === 'object'
            && item.tag
            && item.contextRef
        ) {
            this.list.push(item);
            this.length = this.list.length;
            return this.list;
        }
        throw new Error('Illegal operation');
    }
    pop() {
        const popped = this.list.pop();
        this.length = this.list.length;
        return popped;
    }
    top() {
        return this.list[this.list.length - 1];
    }
    item(index) {
        return this.list[this.length - (index + 1)];
    }
}