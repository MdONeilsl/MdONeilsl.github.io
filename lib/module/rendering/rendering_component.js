

export class rendering_component {
    #parent;

    constructor() { };

    get parent() { return this.#parent; };
    set parent(parent) { this.#parent = parent; };

    get scene() {
        let curr = this;
        while (kind_of(curr) !== `scene`) 
            curr = curr.parent;
        return curr;
    }

};

