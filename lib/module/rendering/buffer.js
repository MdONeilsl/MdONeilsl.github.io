import { error, range_error, type_error } from "../../error.js";
import { NULL, kind_of } from "../../functions.js";
import { array } from "../array.js";
//

const BUFFER_DYNAMIC = (0x1 << 0); // Set fixed length vertex array or flexible (true/false)

const BUFFER_TYPES = {
    INT8: `Int8`,
    UINT8: `Uint8`,
    UINT8C: `Uint8C`,
    INT16: `Int16`,
    UINT16: `Uint16`,
    INT32: `Int32`,
    UINT32: `Uint32`,
    FLOAT32: `Float32`,
    FLOAT64: `Float64`,
    INT64: `Int64`,
    UINT64: `Uint64`
};

export class buffer {
    #name;
    #flags = 0;
    #stride = 1;
    #type = BUFFER_TYPES.FLOAT64;
    #count = 0;
    #data = NULL;

    constructor({ name, dynamic = false, stride, type, data = NULL, count = 0 }) {
        //if (!stride) throw new error(`buffer stride must be set.`);
        //if (!type) throw new error(`buffer type must be defined at construction.`);

        this.#name = name ?? ``;
        if (dynamic == true) this.#flags |= BUFFER_DYNAMIC;

        this.#stride = stride ?? 1;
        if (this.#stride <= 0) throw new error(`buffer stride must be set.`);
        this.#type = type ?? BUFFER_TYPES.FLOAT64;
        this.#count = Math.max(data ? data.length / stride : 0, count);
        this.#create(data);
    }

    get kind() { return `buffer`; };

    static get DYNAMIC() { return BUFFER_DYNAMIC; };
    static get TYPES() { return BUFFER_TYPES; };

    get name() { return this.#name; };
    set name(value) {
        if (kind_of(value) !== `string`) throw new type_error(`buffer name must be a string.`);
        this.#name = value;
    };

    get dynamic() { return (this.#flags & BUFFER_DYNAMIC) > 0; };
    get type() { return this.#type; };
    get stride() { return this.#stride; };
    get count() { return Math.floor(this.#data.length / this.#stride); };

    get data() { return this.#data; };
    set data(value) {
        if (!this.dynamic && value.length < (this.#count * this.#stride))
            throw new error(`buffer data length is too small.`);

        const kind = kind_of(value);
        if (kind !== `array` && kind !== `buffer`)
            throw new type_error(`Value must be a array or a buffer.`);

        this.#create(kind === `array` ? value : value.data);
    };

    get(index, result, offset = 0) {
        this.#check_index(index);

        const start = (index * this.#stride) + offset;
        if (this.#stride === 1) {
            return this.#data[start];
        }

        if (result) {
            if (this.#flags & BUFFER_DYNAMIC) {
                for (let i = 0; i < this.#stride; ++i) {
                    result[i] = this.#data[start + i];
                }
            }
            else {
                result.set(this.#data.slice(start, start + result.length));
            }

            return result;
        }

        const end = start + (this.#stride - offset);
        return this.#data.slice(start, end);
    }

    set(index, value, offset = 0) {
        this.#check_index(index);

        const start = (index * this.#stride) + offset;
        if (this.#stride === 1) {
            this.#data[start] = value;
        }
        else {
            for (let i = 0; i < value.length; ++i) {
                this.#data[start + i] = value[i];
            }
        }
    };

    add(value) {
        if (!array.is_array(value)) throw new type_error("Added value must be of type array");
        if (!this.dynamic) throw new error('Cannot add to a static buffer.');
        this.#create([...this.#data, ...value]);
    }

    #check_index(index) {
        if (index < 0 || index >= this.count)
            throw new range_error(`Index ${index} is out of range.`);
    }

    #create(data) {

        const length = Math.max(this.#count * this.#stride, data ? data.length : 0);

        if (this.#flags & BUFFER_DYNAMIC) {
            this.#data = new Array(length).fill(0);
            if (data) this.#data.map((e, i) => this.#data[i] = data[i]);
        }
        else {

            //console.log(this.#type, BUFFER_TYPES.FLOAT32);
            switch (this.#type) {
                case BUFFER_TYPES.INT8: case BUFFER_TYPES.UINT8:
                case BUFFER_TYPES.INT16: case BUFFER_TYPES.UINT16:
                case BUFFER_TYPES.INT32: case BUFFER_TYPES.UINT32:
                case BUFFER_TYPES.FLOAT32: case BUFFER_TYPES.FLOAT64:
                    this.#data = new globalThis[`${this.#type}Array`](length);
                    break;

                case BUFFER_TYPES.INT64: case BUFFER_TYPES.UINT64:
                    this.#data = new globalThis[`Big${this.#type}Array`](length);
                    break;

                case BUFFER_TYPES.UINT8C: this.#data = new Uint8ClampedArray(length); break;
                default: throw new error(`Unsupported buffer type: ${this.#type}`);
            }
            if (data) {
                if (!array.is_array(data)) throw new type_error("Value must be a array or a buffer.");
                this.#data.set(data.slice(0, this.#data.length));
            }
        }

    }

    equals(other) {
        if (other === NULL) return false;
        //if (this.#name !== other.name) return false;
        if (this.dynamic !== other.dynamic) return false;
        if (this.#stride !== other.stride) return false;
        if (this.#type !== other.type) return false;
        if (this.#count !== other.count) return false;

        for (let i = 0; i < this.#data.length; i++) {
            if (this.#data[i] !== other.data[i]) return false;
        }
        return true;
    };

};

