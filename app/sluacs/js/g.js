export const LIBRARY_DATA = {
    global: {
        func: {
            type: {
                return: "string",
                params: [{ name: "obj", type: "any" }],
                desc: "Returns the type of the object, which is one of \"nil\", \"boolean\", \"number\", \"vector\", \"string\", \"table\", \"function\", \"userdata\", \"thread\", or \"buffer\".",
                expl: "local x = 0\nprint(type(x)) -- output: \"number\""
            },
            typeof: {
                return: "string",
                params: [{ name: "obj", type: "any" }],
                desc: "Returns the type of the object. For host-defined userdata, it may return the value of the __type metatable field.",
                expl: "local t = {}\nprint(typeof(t)) -- \"table\""
            },
            tonumber: {
                return: "number?",
                params: [{ name: "s", type: "string" }, { name: "base", type: "number?" }],
                desc: "Converts the input string to a number in the specified base (default 10). Returns nil if conversion fails.",
                expl: "print(tonumber(\"10\", 16)) -- 16"
            },
            uuid: {
                return: "uuid",
                params: [{ name: "s", type: "string?" }],
                desc: "Creates a new UUID (Universally Unique Identifier). If a string is provided, it attempts to parse it; otherwise, it generates a new random UUID (SLua-specific).",
                expl: "local new_id = uuid()"
            },
            touuid: {
                return: "uuid?",
                params: [{ name: "obj", type: "any" }],
                desc: "Attempts to convert the given object into a UUID object. Returns nil if the conversion fails (SLua-specific).",
                expl: "local id = touuid(\"f47ac10b-58cc-4372-a567-0e02b2c3d479\")"
            },
            tovector: {
                return: "vector?",
                params: [{ name: "obj", type: "any" }],
                desc: "Attempts to convert the given object into a vector (Vector3 or Vector4) object. Returns nil if the conversion fails (SLua-specific).",
                expl: "local v = tovector(\"<1, 2, 3>\")"
            },
            rotation: {
                return: "rotation",
                params: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }, { name: "s", type: "number" }],
                desc: "Creates a new rotation object (quaternion-like) from components $x$, $y$, $z$, and $s$ (real/scalar part) (SLua-specific).",
                expl: "local rot = rotation(0, 0, 0, 1)"
            },
            torotation: {
                return: "rotation?",
                params: [{ name: "obj", type: "any" }],
                desc: "Attempts to convert the given object into a rotation object. Returns nil if the conversion fails (SLua-specific).",
                expl: "local rot = torotation(\"<0, 0, 90> deg\")"
            },
            quaternion: {
                return: "quaternion",
                params: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }, { name: "w", type: "number" }],
                desc: "Creates a new quaternion object from components $x$, $y$, $z$, and $w$ (scalar part) (SLua-specific).",
                expl: "local q = quaternion(0, 0, 0, 1)"
            },
            toquaternion: {
                return: "quaternion?",
                params: [{ name: "obj", type: "any" }],
                desc: "Attempts to convert the given object into a quaternion object. Returns nil if the conversion fails (SLua-specific).",
                expl: "local q = toquaternion({0, 0, 0, 1})"
            },
            tostring: {
                return: "string",
                params: [{ name: "obj", type: "any" }],
                desc: "Converts the input object to a string. Calls the __tostring metamethod if present.",
                expl: "print(tostring(123))"
            },
            setmetatable: {
                return: "table",
                params: [{ name: "t", type: "table" }, { name: "mt", type: "table?" }],
                desc: "Changes the metatable for the given table. Errors if the table already has a protected metatable (with a __metatable field).",
                expl: "local t = {}\nlocal mt = {__index = table}\nsetmetatable(t, mt)"
            },
            getmetatable: {
                return: "table?",
                params: [{ name: "obj", type: "any" }],
                desc: "Returns the metatable for the specified object. If the metatable is protected (has a __metatable key), the value corresponding to that key is returned instead.",
                expl: "local t = {}\nlocal mt = getmetatable(t)"
            },
            print: {
                return: "nil",
                params: [{ name: "args", type: "...any" }],
                desc: "Prints all arguments to the standard output, using Tab as a separator.",
                expl: "print(\"Hello\", 123)"
            },
            error: {
                return: "nil",
                params: [{ name: "obj", type: "any" }, { name: "level", type: "number?" }],
                desc: "Raises an error with the specified object. When level is specified, the error raised includes call frame information.",
                expl: "error(\"Something went wrong\")"
            },
            assert: {
                return: "any",
                params: [{ name: "value", type: "any" }, { name: "message", type: "string?" }],
                desc: "Checks if the value is truthy. If it's not, it raises an error. Upon success, it returns the value argument.",
                expl: "assert(1 == 3) -- throw and error"
            },
            gcinfo: {
                return: "number",
                params: [],
                desc: "Returns the total heap size in kilobytes, which includes bytecode objects, global tables, and script-allocated objects.",
                expl: "local size = gcinfo()"
            },
            pcall: {
                return: "(boolean, ...any)",
                params: [{ name: "f", type: "function" }, { name: "args", type: "...any" }],
                desc: "Calls function f with parameters args in protected mode. Returns true plus f's return values on success, or false plus the error object on failure.",
                expl: "local ok, result = pcall(function() return 1 end)"
            },
            xpcall: {
                return: "(boolean, ...any)",
                params: [{ name: "f", type: "function" }, { name: "e", type: "function" }, { name: "args", type: "...any" }],
                desc: "Calls function f in protected mode. If an error occurs, calls the error handler function e.",
                expl: "local ok, r = xpcall(function() error(\"fail\") end, function(err) return \"Handled: \" .. err end)"
            },
            select: {
                return: "number | ...any",
                params: [{ name: "i", type: "string | number" }, { name: "args", type: "...any" }],
                desc: "When 'i' is '#', returns the number of following arguments. Otherwise, returns the subset of parameters starting with the specified index.",
                expl: "print(select(\"#\", 1, 2, 3)) -- 3"
            },
            ipairs: {
                return: "<iterator>",
                params: [{ name: "t", type: "table" }],
                desc: "Returns an iterator that traverses the array-like part of the table (integer keys 1, 2, 3, ...) until it finds the first nil value.",
                expl: "local t = {1, 2, 3}\nfor i, v in ipairs(t) do print(i, v) end"
            },
            rawlen: {
                return: "number",
                params: [{ name: "t", type: "table | string" }],
                desc: "Returns the raw length of the table or string, bypassing metatables and the __len metamethod.",
                expl: "local arr = {1, 2, 3}\nprint(rawlen(arr))"
            },
            dangerouslyexecuterequiredmodule: {
                return: "...any",
                params: [{ name: "module_id", type: "string" }],
                desc: "Loads and executes a module identified by the given ID, typically bypassing normal security restrictions associated with 'require' (SLua/System-specific).",
                expl: "local result = dangerouslyexecuterequiredmodule(\"MyModule\")"
            },
            rawset: {
                return: "nil",
                params: [{ name: "t", type: "table" }, { name: "k", type: "any" }, { name: "v", type: "any" }],
                desc: "Assigns table field k to the value v, bypassing metatables and the __newindex metamethod.",
                expl: "local t = {}\nrawset(t, \"key\", \"value\")"
            },
            rawequal: {
                return: "boolean",
                params: [{ name: "a", type: "any" }, { name: "b", type: "any" }],
                desc: "Returns true if a and b have the same type and point to the same object (for reference types) or are equal (for value types).",
                expl: "local t = {}\nprint(rawequal(t, t))"
            },
            newproxy: {
                return: "userdata",
                params: [{ name: "mt", type: "boolean?" }],
                desc: "Creates a new untyped userdata object. If 'mt' is true, the new object has an empty metatable that can be modified.",
                expl: "local proxy = newproxy(true)"
            },
            pairs: {
                return: "<iterator>",
                params: [{ name: "t", type: "table" }],
                desc: "Returns an iterator that traverses all key-value pairs in the table (numeric and otherwise) in an undefined order.",
                expl: "local t = {a=1, [1]=2}\nfor k, v in pairs(t) do print(k, v) end"
            },
            unpack: {
                return: "...any",
                params: [{ name: "a", type: "table" }, { name: "f", type: "number?" }, { name: "t", type: "number?" }],
                desc: "Returns all values of a with indices in the [f..t] range. Equivalent to table.unpack.",
                expl: "local t = {10, 20, 30}\nprint(unpack(t, 2))"
            },
            rawget: {
                return: "any?",
                params: [{ name: "t", type: "table" }, { name: "k", type: "any" }],
                desc: "Performs a table lookup with index k, bypassing metatables and the __index metamethod.",
                expl: "local t = {foo = \"bar\"}\nprint(rawget(t, \"foo\"))"
            },
            next: {
                return: "(any, any)?",
                params: [{ name: "t", type: "table" }, { name: "i", type: "any?" }],
                desc: "Given a table t, returns the next key-value pair after key i in the table traversal order. If i is nil, it returns the first key-value pair.",
                expl: "local t = {a=1}\nlocal key, value = next(t)"
            }
        }
    },
    string: {
        func: {
            split: {
                return: "{string}",
                params: [{ name: "s", type: "string" }, { name: "sep", type: "string?" }],
                desc: "Splits the input string 's' using 'sep' as a separator (defaults to \",\") and returns the resulting substrings in a table.",
                expl: "local t = string.split(\"a,b,c\", \",\") -- t = {\"a\", \"b\", \"c\"}"
            },
            match: {
                return: "...string?",
                params: [{ name: "s", type: "string" }, { name: "p", type: "string" }, { name: "init", type: "number?" }],
                desc: "Tries to find an instance of pattern 'p' in the string 's'. If found, returns all pattern captures, or the entire matching substring, otherwise returns nil.",
                expl: "local cap = string.match(\"hello world\", \"(%a+)\") -- cap = \"hello\""
            },
            gmatch: {
                return: "<iterator>",
                params: [{ name: "s", type: "string" }, { name: "p", type: "string" }],
                desc: "Returns an iterator function that, each time it is called, returns the next captures from pattern 'p' over string 's'.",
                expl: "for w in string.gmatch(\"a b c\", \"%a+\") do print(w) end"
            },
            upper: {
                return: "string",
                params: [{ name: "s", type: "string" }],
                desc: "Returns a copy of the string 's' with all ASCII lowercase letters converted to uppercase.",
                expl: "local s = string.upper(\"hello\") -- s = \"HELLO\""
            },
            gsub: {
                return: "(string, number)",
                params: [{ name: "s", type: "string" }, { name: "p", type: "string" }, { name: "f", type: "string | table | function" }, { name: "maxs", type: "number?" }],
                desc: "Searches for pattern 'p' in string 's' and replaces the matches according to 'f'. Returns the resulting string and the number of substitutions made.",
                expl: "local s, count = string.gsub(\"a b a\", \"a\", \"c\") -- s = \"c b c\", count = 2"
            },
            format: {
                return: "string",
                params: [{ name: "formatstring", type: "string" }, { name: "args", type: "...any" }],
                desc: "Returns a formatted version of its variable arguments following the description given in the format string (similar to C's sprintf).",
                expl: "local s = string.format(\"The answer is %d.\", 42) -- s = \"The answer is 42.\""
            },
            lower: {
                return: "string",
                params: [{ name: "s", type: "string" }],
                desc: "Returns a copy of the string 's' with all ASCII uppercase letters converted to lowercase.",
                expl: "local s = string.lower(\"WORLD\") -- s = \"world\""
            },
            sub: {
                return: "string",
                params: [{ name: "s", type: "string" }, { name: "f", type: "number" }, { name: "t", type: "number?" }],
                desc: "Returns a substring of 's' from index 'f' to 't' (inclusive). Negative indices count from the end of the string.",
                expl: "local s = string.sub(\"abcde\", 2, 4) -- s = \"bcd\""
            },
            pack: {
                return: "string",
                params: [{ name: "f", type: "string" }, { name: "args", type: "...any" }],
                desc: "Encodes all input parameters into a binary string according to the packing format string 'f'.",
                expl: "local s = string.pack(\"i32\", 100)"
            },
            find: {
                return: "(number, number)?",
                params: [{ name: "s", type: "string" }, { name: "p", type: "string" }, { name: "init", type: "number?" }, { name: "plain", type: "boolean?" }],
                desc: "Looks for a pattern 'p' or literal string in 's'. If found, returns the starting and ending indices of the match; otherwise, returns nil.",
                expl: "local start, finish = string.find(\"abcde\", \"cd\") -- start = 3, finish = 4"
            },
            char: {
                return: "string",
                params: [{ name: "bytecodes", type: "...number" }],
                desc: "Receives zero or more integers, assumes they are byte codes, and returns a string of that length with each byte equal to the corresponding argument.",
                expl: "local s = string.char(72, 101, 108, 108, 111) -- s = \"Hello\""
            },
            packsize: {
                return: "number",
                params: [{ name: "f", type: "string" }],
                desc: "Given a pack format string 'f', returns the size in bytes of the resulting packed representation. The format cannot use variable-length specifiers.",
                expl: "local size = string.packsize(\"i32\") -- size = 4"
            },
            reverse: {
                return: "string",
                params: [{ name: "s", type: "string" }],
                desc: "Returns the string 's' with the order of bytes reversed. Only works correctly for ASCII/binary strings.",
                expl: "local s = string.reverse(\"desserts\") -- s = \"stressed\""
            },
            byte: {
                return: "...number",
                params: [{ name: "s", type: "string" }, { name: "i", type: "number?" }, { name: "j", type: "number?" }],
                desc: "Returns the numerical codes of the bytes in the string 's' from index 'i' to 'j' (inclusive).",
                expl: "local code = string.byte(\"A\") -- code = 65"
            },
            unpack: {
                return: "...any",
                params: [{ name: "f", type: "string" }, { name: "s", type: "string" }],
                desc: "Given a pack format string 'f', decodes the input binary string 's' and returns all resulting values.",
                expl: "local num = string.unpack(\"i32\", string.pack(\"i32\", 100)) -- num = 100"
            },
            rep: {
                return: "string",
                params: [{ name: "s", type: "string" }, { name: "n", type: "number" }],
                desc: "Returns the input string 's' repeated 'n' times. Returns an empty string if 'n' is zero or negative.",
                expl: "local s = string.rep(\"hi\", 3) -- s = \"hihihi\""
            },
            len: {
                return: "number",
                params: [{ name: "s", type: "string" }],
                desc: "Returns the number of bytes in the string (equivalent to #s).",
                expl: "local l = string.len(\"test\") -- l = 4"
            }
        }
    },
    os: {
        func: {
            clock: {
                return: "number",
                params: [],
                desc: "Returns an approximation of the amount of CPU time used by the program (in seconds). Used for measuring code duration with high precision.",
                expl: "local start = os.clock()\n-- code here\nlocal duration = os.clock() - start"
            },
            difftime: {
                return: "number",
                params: [{ name: "a", type: "number" }, { name: "b", type: "number" }],
                desc: "Calculates the difference in seconds between two time values, 'a' and 'b'. (For compatibility; recommended to use 'a - b' instead).",
                expl: "local time_a = os.time()\nlocal time_b = os.time() + 10\nlocal diff = os.difftime(time_b, time_a)"
            },
            time: {
                return: "number",
                params: [{ name: "t", type: "table?" }],
                desc: "When called without arguments, returns the current date/time as a **Unix timestamp** (seconds since epoch). When called with a table containing $sec/min/hour/day/month/year$ keys, returns the timestamp for that specified date/time in UTC.",
                expl: "local now_timestamp = os.time()\nlocal date_table = {year=2024, month=1, day=1}\nlocal new_year_ts = os.time(date_table)"
            },
            date: {
                return: "table | string",
                params: [{ name: "s", type: "string?" }, { name: "t", type: "number?" }],
                desc: "Returns the table or string representation of the time specified by 't' (defaults to current time) based on the format string 's'. If 's' is `*t`, a table is returned. Prefixing 's' with `!` uses UTC time.",
                expl: "local utc_table = os.date(\"!*t\")\nlocal current_time_string = os.date(\"%c\")"
            }
        }
    },
    buffer: {
        func: {
            create: {
                return: "buffer",
                params: [{ name: "size", type: "number" }],
                desc: "Creates a new buffer of the specified size in bytes, initialized to zeros.",
                expl: "local b = buffer.create(16) -- creates a 16-byte buffer"
            },
            fromstring: {
                return: "buffer",
                params: [{ name: "s", type: "string" }],
                desc: "Creates a new buffer with the contents copied from the input string.",
                expl: "local b = buffer.fromstring(\"\\x01\\x02\\x03\")"
            },
            tostring: {
                return: "string",
                params: [{ name: "b", type: "buffer" }],
                desc: "Returns the buffer data as a raw binary string.",
                expl: "local s = buffer.tostring(b)"
            },
            len: {
                return: "number",
                params: [{ name: "b", type: "buffer" }],
                desc: "Returns the size of the buffer in bytes (equivalent to #b).",
                expl: "local size = buffer.len(b)"
            },
            copy: {
                return: "nil",
                params: [{ name: "target", type: "buffer" }, { name: "targetOffset", type: "number" }, { name: "source", type: "buffer" }, { name: "sourceOffset", type: "number?" }, { name: "count", type: "number?" }],
                desc: "Copies a region of data from the 'source' buffer to the 'target' buffer. Defaults copy the entire remaining source data.",
                expl: "buffer.copy(b1, 0, b2, 4, 8) -- copies 8 bytes from b2[4] to b1[0]"
            },
            fill: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }, { name: "count", type: "number?" }],
                desc: "Sets 'count' bytes in the buffer starting at 'offset' to the 8-bit 'value'.",
                expl: "buffer.fill(b, 0, 0xFF, 4) -- set first 4 bytes to 255"
            },

            readi8: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads a signed 8-bit integer (i8) at the specified offset.",
                expl: "local n = buffer.readi8(b, 0)"
            },
            readu8: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads an unsigned 8-bit integer (u8) at the specified offset.",
                expl: "local n = buffer.readu8(b, 1)"
            },
            readi16: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads a signed 16-bit integer (i16) at the specified offset (Little Endian).",
                expl: "local n = buffer.readi16(b, 2)"
            },
            readu16: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads an unsigned 16-bit integer (u16) at the specified offset (Little Endian).",
                expl: "local n = buffer.readu16(b, 4)"
            },
            readi32: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads a signed 32-bit integer (i32) at the specified offset (Little Endian).",
                expl: "local n = buffer.readi32(b, 6)"
            },
            readu32: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads an unsigned 32-bit integer (u32) at the specified offset (Little Endian).",
                expl: "local n = buffer.readu32(b, 10)"
            },
            readf32: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads a 32-bit single-precision float (f32) at the specified offset (IEEE 754, Little Endian).",
                expl: "local f = buffer.readf32(b, 14)"
            },
            readf64: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }],
                desc: "Reads a 64-bit double-precision float (f64) at the specified offset (IEEE 754, Little Endian).",
                expl: "local f = buffer.readf64(b, 18)"
            },

            writei8: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes an 8-bit signed integer (i8) value at the specified offset.",
                expl: "buffer.writei8(b, 0, -51)"
            },
            writeu8: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes an 8-bit unsigned integer (u8) value at the specified offset.",
                expl: "buffer.writeu8(b, 1, 200)"
            },
            writei16: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a 16-bit signed integer (i16) value at the specified offset (Little Endian).",
                expl: "buffer.writei16(b, 2, -1000)"
            },
            writeu16: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a 16-bit unsigned integer (u16) value at the specified offset (Little Endian).",
                expl: "buffer.writeu16(b, 4, 50000)"
            },
            writei32: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a 32-bit signed integer (i32) value at the specified offset (Little Endian).",
                expl: "buffer.writei32(b, 6, -100000)"
            },
            writeu32: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a 32-bit unsigned integer (u32) value at the specified offset (Little Endian).",
                expl: "buffer.writeu32(b, 10, 3000000000)"
            },
            writef32: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a 32-bit single-precision float (f32) value at the specified offset (IEEE 754, Little Endian).",
                expl: "buffer.writef32(b, 14, 3.14)"
            },
            writef64: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a 64-bit double-precision float (f64) value at the specified offset (IEEE 754, Little Endian).",
                expl: "buffer.writef64(b, 18, 1.2345e-10)"
            },

            readstring: {
                return: "string",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "count", type: "number" }],
                desc: "Reads 'count' bytes from the buffer starting at 'offset' and returns them as a string.",
                expl: "local s = buffer.readstring(b, 0, 3)"
            },
            writestring: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "offset", type: "number" }, { name: "s", type: "string" }],
                desc: "Writes the contents of string 's' into the buffer starting at 'offset'.",
                expl: "buffer.writestring(b, 0, \"ABC\")"
            },
            readbits: {
                return: "number",
                params: [{ name: "b", type: "buffer" }, { name: "bitOffset", type: "number" }, { name: "count", type: "number" }],
                desc: "Reads 'count' bits from the buffer starting at 'bitOffset' and returns the value as a number.",
                expl: "local val = buffer.readbits(b, 0, 4)"
            },
            writebits: {
                return: "nil",
                params: [{ name: "b", type: "buffer" }, { name: "bitOffset", type: "number" }, { name: "count", type: "number" }, { name: "value", type: "number" }],
                desc: "Writes a number of bits ('count') from 'value' into the buffer starting at 'bitOffset'.",
                expl: "buffer.writebits(b, 0, 4, 0xA)"
            }
        }
    },
    math: {
        var: {
            huge: "inf (number)",
            pi: "3.141592653589793 (number)"
        },
        func: {
            abs: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the absolute value of 'n'.",
                expl: "local a = math.abs(-10.5) -- 10.5"
            },
            acos: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the arc cosine of 'n', expressed in radians. Range [0, pi].",
                expl: "local r = math.acos(0.5)"
            },
            asin: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the arc sine of 'n', expressed in radians. Range [-pi/2, pi/2].",
                expl: "local r = math.asin(1)"
            },
            atan: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the arc tangent of 'n', expressed in radians. Range [-pi/2, pi/2].",
                expl: "local r = math.atan(1)"
            },
            atan2: {
                return: "number",
                params: [{ name: "y", type: "number" }, { name: "x", type: "number" }],
                desc: "Returns the arc tangent of y/x, using the signs of both arguments to determine the quadrant.",
                expl: "local r = math.atan2(-1, -1) -- 3rd quadrant"
            },
            ceil: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Rounds 'n' upwards to the next integer boundary.",
                expl: "local c = math.ceil(4.2) -- 5"
            },
            clamp: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "min", type: "number" }, { name: "max", type: "number" }],
                desc: "Returns 'n' constrained to be within the range ['min', 'max']. (Luau extension)",
                expl: "local c = math.clamp(10, 0, 5) -- 5"
            },
            cos: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the cosine of 'n', an angle in radians.",
                expl: "local c = math.cos(0) -- 1"
            },
            cosh: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the hyperbolic cosine of 'n'.",
                expl: "local c = math.cosh(0) -- 1"
            },
            deg: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Converts the angle 'n' from radians to degrees.",
                expl: "local d = math.deg(math.pi) -- 180"
            },
            exp: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the base-e exponent of 'n' ($e^n$).",
                expl: "local e = math.exp(1) -- 2.718..."
            },
            floor: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Rounds 'n' downwards to the previous integer boundary.",
                expl: "local f = math.floor(4.8) -- 4"
            },
            fmod: {
                return: "number",
                params: [{ name: "x", type: "number" }, { name: "y", type: "number" }],
                desc: "Returns the remainder of x modulo y, rounded towards zero.",
                expl: "local m = math.fmod(10, 3) -- 1"
            },
            frexp: {
                return: "(number, number)",
                params: [{ name: "n", type: "number" }],
                desc: "Splits 'n' into a significand ($s$) and binary exponent ($e$) such that $n = s \cdot 2^e$. Returns s, e.",
                expl: "local s, e = math.frexp(12) -- s = 0.75, e = 4"
            },
            ldexp: {
                return: "number",
                params: [{ name: "s", type: "number" }, { name: "e", type: "number" }],
                desc: "Returns a number constructed from a significand ('s') and binary exponent ('e'): $s \cdot 2^e$.",
                expl: "local n = math.ldexp(0.5, 3) -- 4"
            },
            lerp: {
                return: "number",
                params: [{ name: "a", type: "number" }, { name: "b", type: "number" }, { name: "t", type: "number" }],
                desc: "Linearly interpolates between 'a' and 'b' using the factor 't': $a + (b - a) \cdot t$. (Luau extension)",
                expl: "local l = math.lerp(0, 10, 0.5) -- 5"
            },
            log: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "base", type: "number?" }],
                desc: "Returns the logarithm of 'n' in the specified 'base' (defaults to $e$).",
                expl: "local l = math.log(100)"
            },
            log10: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the base-10 logarithm of 'n'.",
                expl: "local l = math.log10(100) -- 2"
            },
            map: {
                return: "number",
                params: [{ name: "x", type: "number" }, { name: "inmin", type: "number" }, { name: "inmax", type: "number" }, { name: "outmin", type: "number" }, { name: "outmax", type: "number" }],
                desc: "Maps 'x' linearly from the input range [inmin, inmax] to the output range [outmin, outmax]. (Luau extension)",
                expl: "local m = math.map(50, 0, 100, 0, 1) -- 0.5"
            },
            max: {
                return: "number",
                params: [{ name: "list", type: "...number" }],
                desc: "Returns the maximum number of the input arguments.",
                expl: "local m = math.max(1, 5, 2) -- 5"
            },
            min: {
                return: "number",
                params: [{ name: "list", type: "...number" }],
                desc: "Returns the minimum number of the input arguments.",
                expl: "local m = math.min(1, 5, 2) -- 1"
            },
            modf: {
                return: "(number, number)",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the integer part and the fractional part of 'n'. Both parts have the same sign as 'n'.",
                expl: "local i, f = math.modf(3.14) -- i = 3, f = 0.14"
            },
            noise: {
                return: "number",
                params: [{ name: "x", type: "number" }, { name: "y", type: "number?" }, { name: "z", type: "number?" }],
                desc: "Returns a 3D Perlin noise value for the point (x, y, z), normalized to the range [-1, 1]. (Luau extension)",
                expl: "local n = math.noise(10, 5) -- 2D noise"
            },
            pow: {
                return: "number",
                params: [{ name: "x", type: "number" }, { name: "y", type: "number" }],
                desc: "Returns x raised to the power of y ($x^y$).",
                expl: "local p = math.pow(2, 3) -- 8"
            },
            rad: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Converts the angle 'n' from degrees to radians.",
                expl: "local r = math.rad(90) -- math.pi/2"
            },
            random: {
                return: "number",
                params: [{ name: "min", type: "number?" }, { name: "max", type: "number?" }],
                desc: "Returns a pseudo-random number: [0, 1] (0 args), [1, n] (1 arg), or [min, max] (2 args).",
                expl: "local r = math.random(1, 6) -- simulates a dice roll"
            },
            randomseed: {
                return: "nil",
                params: [{ name: "seed", type: "number" }],
                desc: "Reseeds the global pseudo-random number generator, establishing a new sequence.",
                expl: "math.randomseed(os.time())"
            },
            round: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Rounds 'n' to the nearest integer. Halfway cases are rounded away from zero. (Luau extension)",
                expl: "local r = math.round(3.5) -- 4"
            },
            sign: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns -1, 0, or 1 indicating the sign of 'n'. (Luau extension)",
                expl: "local s = math.sign(-5) -- -1"
            },
            sin: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the sine of 'n', an angle in radians.",
                expl: "local s = math.sin(math.pi / 2) -- 1"
            },
            sinh: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the hyperbolic sine of 'n'.",
                expl: "local s = math.sinh(1)"
            },
            sqrt: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the square root of 'n'.",
                expl: "local s = math.sqrt(16) -- 4"
            },
            tan: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the tangent of 'n', an angle in radians.",
                expl: "local t = math.tan(0) -- 0"
            },
            tanh: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Returns the hyperbolic tangent of 'n'.",
                expl: "local t = math.tanh(1)"
            }
        }
    },
    lljson: {
        table: {
            array_mt: {
                desc: "A metatable used to explicitly mark a Luau table to be encoded as a JSON array ([]). The encoder will iterate over the numerical part (up to the length determined by '#') and encode non-present keys (holes) as JSON null.",
                expl: "local t = {1, 2, 4} t[3] = lljson.null setmetatable(t, lljson.array_mt) -- lljson.encode(t) returns '[1, 2, null, 4]'"
            },
            empty_array_mt: {
                desc: "A metatable used to explicitly mark an *empty* Luau table ({}) to be encoded as an empty JSON array ([]), overriding the library's default behavior (which may encode an empty table as an empty object {}).",
                expl: "local t = {} setmetatable(t, lljson.empty_array_mt) -- lljson.encode({data = t}) returns '{\"data\":[]}'"
            }
        },
        var: {
            empty_array: {
                type: "lljson_constant: 0x0000000000000005 (userdata)",
                desc: "A constant (lightuserdata) which, when used as a value in a Luau table, forces that value to be encoded as an empty JSON array ([]). Used to explicitly represent an empty array within a JSON object."
            },
            null: {
                type: "lljson_constant: 0x0000000000000003 (userdata)",
                desc: "A constant (lightuserdata) used to represent the JSON 'null' value within a Luau table. Since 'nil' values are discarded by Luau tables, this constant preserves explicit nulls during encoding."
            }
        },
        func: {
            encode: {
                return: "string",
                params: [{ name: "value", type: "any" }],
                desc: "Serializes a Luau table, string, number, boolean, or lljson constant into a JSON formatted string. This handles the 'lljson.null' constant.",
                expl: "local jsonString = lljson.encode({id = 1, value = lljson.null})"
            },
            decode: {
                return: "any",
                params: [{ name: "jsonString", type: "string" }],
                desc: "Parses a JSON formatted string and returns the resulting Luau value (table, string, number, etc.). JSON 'null' values are decoded into the 'lljson.null' constant.",
                expl: "local data = lljson.decode('{\"id\":1,\"value\":null}') -- data.value is lljson.null"
            }
        }
    },
    vector: {
        var: {
            one: "<1, 1, 1> (vector)",
            zero: "<0, 0, 0> (vector)"
        },
        func: {
            abs: {
                return: "vector",
                params: [{ name: "vec", type: "vector" }],
                desc: "Returns a new vector with the absolute value of every component.",
                expl: "local v = vector.abs(vector.create(-1, 2, -3))"
            },
            angle: {
                return: "number",
                params: [{ name: "vec1", type: "vector" }, { name: "vec2", type: "vector" }, { name: "axis", type: "vector?" }],
                desc: "Computes the angle (in radians) between two vectors. The optional 'axis' is used to determine the sign.",
                expl: "local a = vector.angle(v1, v2)"
            },
            ceil: {
                return: "vector",
                params: [{ name: "vec", type: "vector" }],
                desc: "Returns a new vector with math.ceil() applied component-wise to the input vector.",
                expl: "local c = vector.ceil(vector.create(1.2, 2.8, 3.0))"
            },
            clamp: {
                return: "vector",
                params: [{ name: "vec", type: "vector" }, { name: "min", type: "vector" }, { name: "max", type: "vector" }],
                desc: "Returns a new vector with each component clamped between the corresponding components of the 'min' and 'max' vectors.",
                expl: "local c = vector.clamp(v, vector.zero, vector.one)"
            },
            create: {
                return: "vector",
                params: [{ name: "x", type: "number" }, { name: "y", type: "number" }, { name: "z", type: "number" }],
                desc: "Constructs a new 3D vector with the given component values.",
                expl: "local v = vector.create(10, 5, 0)"
            },
            cross: {
                return: "vector",
                params: [{ name: "vec1", type: "vector" }, { name: "vec2", type: "vector" }],
                desc: "Computes the cross product (v1 x v2) of the two vectors, resulting in a vector perpendicular to both.",
                expl: "local c = vector.cross(v1, v2)"
            },
            dot: {
                return: "number",
                params: [{ name: "vec1", type: "vector" }, { name: "vec2", type: "vector" }],
                desc: "Computes the dot product (v1 · v2) of the two vectors, returning a scalar value.",
                expl: "local d = vector.dot(v1, v2)"
            },
            floor: {
                return: "vector",
                params: [{ name: "vec", type: "vector" }],
                desc: "Returns a new vector with math.floor() applied component-wise to the input vector.",
                expl: "local f = vector.floor(vector.create(1.8, 2.2, 3.0))"
            },
            magnitude: {
                return: "number",
                params: [{ name: "vec", type: "vector" }],
                desc: "Calculates the length (magnitude) of the vector: $\\sqrt{x^2 + y^2 + z^2}$.",
                expl: "local m = vector.magnitude(v)"
            },
            max: {
                return: "vector",
                params: [{ name: "list", type: "...vector" }],
                desc: "Returns a vector where each component is the maximum of the corresponding components across all input vectors.",
                expl: "local m = vector.max(v1, v2)"
            },
            min: {
                return: "vector",
                params: [{ name: "list", type: "...vector" }],
                desc: "Returns a vector where each component is the minimum of the corresponding components across all input vectors.",
                expl: "local m = vector.min(v1, v2)"
            },
            normalize: {
                return: "vector",
                params: [{ name: "vec", type: "vector" }],
                desc: "Computes the unit vector (length 1) in the same direction as the input vector. Returns vector.zero if the magnitude is zero.",
                expl: "local n = vector.normalize(v)"
            },
            sign: {
                return: "vector",
                params: [{ name: "vec", type: "vector" }],
                desc: "Returns a new vector with math.sign() applied component-wise to the input vector.",
                expl: "local s = vector.sign(vector.create(-5, 0, 10))"
            }
        }
    },
    coroutine: {
        func: {
            create: {
                return: "thread",
                params: [{ name: "f", type: "function" }],
                desc: "Creates a new coroutine (thread) that will execute function 'f' when first resumed. The coroutine starts in the 'suspended' state.",
                expl: "local co = coroutine.create(function(a) return a*2 end)"
            },
            resume: {
                return: "(boolean, ...any)",
                params: [{ name: "co", type: "thread" }, { name: "args", type: "...any" }],
                desc: "Resumes the coroutine 'co', passing 'args' as arguments. Returns 'true' and the coroutine's return/yield values, or 'false' and an error object on failure.",
                expl: "local success, result = coroutine.resume(co, 5)"
            },
            yield: {
                return: "...any",
                params: [{ name: "args", type: "...any" }],
                desc: "Suspends the execution of the running coroutine, passing 'args' as return values to the 'resume' call that activated it. When the coroutine is resumed again, the arguments passed to 'resume' become the return values of coroutine.yield.",
                expl: "local result = coroutine.yield('Paused')"
            },
            status: {
                return: "string",
                params: [{ name: "co", type: "thread" }],
                desc: "Returns the status of the coroutine, which can be 'running', 'suspended', 'normal' (active but not running), or 'dead' (finished or closed).",
                expl: "local s = coroutine.status(co)"
            },
            wrap: {
                return: "function",
                params: [{ name: "f", type: "function" }],
                desc: "Creates a new coroutine and returns a function that, when called, resumes the coroutine. Errors are propagated.",
                expl: "local wrapped = coroutine.wrap(function() print('Run') end) wrapped()"
            },
            running: {
                return: "thread?",
                params: [],
                desc: "Returns the currently executing coroutine (thread), or nil if the code is running in the main coroutine.",
                expl: "local current = coroutine.running()"
            },
            isyieldable: {
                return: "boolean",
                params: [],
                desc: "Returns true if the currently running coroutine can safely call coroutine.yield().",
                expl: "if coroutine.isyieldable() then ... end"
            },
            close: {
                return: "(boolean, any?)",
                params: [{ name: "co", type: "thread" }],
                desc: "Closes the coroutine, putting it in the 'dead' state and releasing resources. It must be suspended or dead. Returns 'true' on success, or 'false' and an error object if the coroutine was in an error state.",
                expl: "local ok = coroutine.close(co)"
            }
        }
    },
    llbase64: {
        func: {
            encode: {
                return: "string",
                params: [{ name: "str", type: "string" }],
                desc: "Encodes the input string (which may contain binary data) into a Base64-formatted string using the standard alphabet. This is commonly used for safely transferring binary data over text-only mediums.",
                expl: "local encoded = llbase64.encode('Hello, world!') -- 'SGVsbG8sIHdvcmxkIQ=='"
            },
            decode: {
                return: "string",
                params: [{ name: "str", type: "string" }],
                desc: "Decodes a Base64-formatted input string back into its original raw string (binary) data.",
                expl: "local decoded = llbase64.decode('SGVsbG8sIHdvcmxkIQ==') -- 'Hello, world!'"
            }
        }
    },
    debug: {
        func: {
            info: {
                return: "table",
                params: [{ name: "f", type: "function | number" }, { name: "what", type: "string?" }],
                desc: "Returns a table containing information about a function 'f' or a function at a specific stack level (when 'f' is a number). The optional 'what' string controls which fields are returned (e.g., 'S' for source, 'l' for line, 'n' for name).",
                expl: "local f_info = debug.info(myFunction, 'nS')"
            },
            traceback: {
                return: "string",
                params: [{ name: "co", type: "thread?" }, { name: "msg", type: "string?" }, { name: "level", type: "number?" }],
                desc: "Produces a stringified call stack (stack trace) of the given coroutine thread 'co', or the current thread if 'co' is omitted. 'msg' provides an optional header, and 'level' specifies where the trace should begin.",
                expl: "local stackTrace = debug.traceback('Error occurred:', 2)"
            }
        }
    },
    table: {
        func: {
            getn: {
                return: "number",
                params: [{ name: "t", type: "{any}" }],
                desc: "Returns the length of the array portion of table 't'. **(Deprecated: Use #t instead.)**",
                expl: "local len = table.getn(myTable)"
            },
            foreachi: {
                return: "any?",
                params: [{ name: "t", type: "{any}" }, { name: "f", type: "(number, any) -> any?" }],
                desc: "Iterates over the numeric keys of the table in order [1..#t], calling function 'f' for each. Stops and returns the first non-nil value returned by 'f'. **(Deprecated: Use a for loop instead.)**",
                expl: "table.foreachi(t, print)"
            },
            foreach: {
                return: "any?",
                params: [{ name: "t", type: "table" }, { name: "f", type: "(any, any) -> any?" }],
                desc: "Iterates over all key-value pairs of the table (numeric and hash), calling function 'f' for each. Stops and returns the first non-nil value returned by 'f'. **(Deprecated: Use a for loop with 'pairs' instead.)**",
                expl: "table.foreach(t, print)"
            },
            sort: {
                return: "nil",
                params: [{ name: "t", type: "{any}" }, { name: "f", type: "((any, any) -> boolean)?" }],
                desc: "Sorts the array portion of table 't' in place. An optional comparison function 'f' can be provided.",
                expl: "table.sort(t, function(a, b) return a > b end)"
            },
            unpack: {
                return: "...any",
                params: [{ name: "a", type: "{any}" }, { name: "f", type: "number?" }, { name: "t", type: "number?" }],
                desc: "Returns all values of the table 'a' with indices in the range [f..t]. Equivalent to the global 'unpack'.",
                expl: "local a, b = table.unpack({10, 20})"
            },
            freeze: {
                return: "table",
                params: [{ name: "t", type: "table" }],
                desc: "Freezes the table 't' in place, making it and its metatable immutable. Subsequent attempts to modify it will raise an error. **(Luau Extension)**",
                expl: "local frozenT = table.freeze(t)"
            },
            clear: {
                return: "nil",
                params: [{ name: "t", type: "table" }],
                desc: "Removes all elements (numeric and hash) from the table, but preserves the table's internal memory capacity for future use. **(Luau Extension)**",
                expl: "table.clear(t)"
            },
            pack: {
                return: "table",
                params: [{ name: "args", type: "...any" }],
                desc: "Returns a new table containing all input arguments as array elements, plus a field 'n' set to the number of inputs.",
                expl: "local packed = table.pack(1, 'a', true)"
            },
            move: {
                return: "{any}",
                params: [{ name: "a", type: "{any}" }, { name: "f", type: "number" }, { name: "t", type: "number" }, { name: "d", type: "number" }, { name: "tt", type: "{any}?" }],
                desc: "Copies elements from range [f..t] in table 'a' to table 'tt' (or back to 'a' if 'tt' is nil), starting at index 'd'.",
                expl: "table.move(a, 1, #a, 1, b) -- Move all from a to b"
            },
            insert: {
                return: "nil",
                params: [{ name: "t", type: "{any}" }, { name: "i", type: "number|any?" }, { name: "v", type: "any" }],
                desc: "Inserts value 'v' into the table 't'. If 'i' is omitted, 'v' is appended to the end. If 'i' is a number, 'v' is inserted at that index, shifting existing elements up.",
                expl: "table.insert(t, 'new'); table.insert(t, 2, 'middle')"
            },
            create: {
                return: "{any}",
                params: [{ name: "n", type: "number" }, { name: "v", type: "any?" }],
                desc: "Creates a new table preallocated for 'n' array elements, optionally setting all elements in range [1..n] to 'v'. **(Luau Extension)**",
                expl: "local t = table.create(10) -- Preallocates space"
            },
            maxn: {
                return: "number",
                params: [{ name: "t", type: "{any}" }],
                desc: "Returns the largest numeric key present in the table 't', or 0 if no numeric keys exist. **(Deprecated)**",
                expl: "local maxKey = table.maxn(t)"
            },
            isfrozen: {
                return: "boolean",
                params: [{ name: "t", type: "table" }],
                desc: "Returns true if the input table 't' has been frozen by table.freeze(). **(Luau Extension)**",
                expl: "local status = table.isfrozen(t)"
            },
            concat: {
                return: "string",
                params: [{ name: "list", type: "{string}" }, { name: "sep", type: "string?" }, { name: "i", type: "number?" }, { name: "j", type: "number?" }],
                desc: "Concatenates the strings in the array portion of 'list' into a single string, separated by 'sep' (default empty string). The range [i..j] can be specified.",
                expl: "local s = table.concat({'a', 'b', 'c'}, ', ')"
            },
            clone: {
                return: "table",
                params: [{ name: "t", type: "table" }],
                desc: "Returns a **shallow copy** of the table 't', retaining its keys, values, and metatable. The clone is not frozen, even if 't' was. **(Luau Extension)**",
                expl: "local copyT = table.clone(t)"
            },
            find: {
                return: "number?",
                params: [{ name: "t", type: "{any}" }, { name: "v", type: "any" }, { name: "init", type: "number?" }],
                desc: "Searches the array portion of 't' for the first element equal to 'v' and returns its index. The search starts at index 'init' (default 1). Returns nil if not found. **(Luau Extension)**",
                expl: "local index = table.find(t, 'target')"
            },
            remove: {
                return: "any?",
                params: [{ name: "t", type: "{any}" }, { name: "i", type: "number?" }],
                desc: "Removes and returns the element at index 'i', or the last element if 'i' is omitted. Shifts subsequent elements down by 1.",
                expl: "local removed = table.remove(t, 1)"
            }
        }
    },
    utf8: {
        var: {
            charpattern: "[\\0-\\x7F\\xC2-\\xF4][\\x80-\\xBF]*"
        },
        func: {
            offset: {
                return: "number?",
                params: [{ name: "s", type: "string" }, { name: "offset", type: "number" }, { name: "pos", type: "number?" }],
                desc: "Returns the byte index (offset) in string 's' of the codepoint that is 'offset' characters away from the start position 'pos' (defaults to 1). Returns nil if the character is not found.",
                expl: "local byte_start = utf8.offset('héllo', 2) -- start of 'é'"
            },
            codes: {
                return: "<iterator>",
                params: [{ name: "s", type: "string" }],
                desc: "Returns an iterator function that, when used in a for loop, yields the starting **byte offset** and the **Unicode codepoint** for each UTF-8 character in the string.",
                expl: "for offset, codepoint in utf8.codes('a€b') do print(offset, codepoint) end"
            },
            codepoint: {
                return: "...number",
                params: [{ name: "s", type: "string" }, { name: "i", type: "number?" }, { name: "j", type: "number?" }],
                desc: "Returns the Unicode codepoint(s) for the character(s) in string 's' that start at byte offset(s) in the range [i..j].",
                expl: "local euro_code = utf8.codepoint('a€b', 2) -- 8364"
            },
            len: {
                return: "number?",
                params: [{ name: "s", type: "string" }, { name: "i", type: "number?" }, { name: "j", type: "number?" }],
                desc: "Returns the number of **codepoints** (characters) in the string range [i..j]. Returns nil followed by the position of the first invalid byte if the string is malformed.",
                expl: "local char_count = utf8.len('héllo') -- 5"
            },
            char: {
                return: "string",
                params: [{ name: "args", type: "...number" }],
                desc: "Creates a UTF-8 encoded string by converting the input numerical codepoints into characters and concatenating them.",
                expl: "local hearts = utf8.char(9829) -- '♥'"
            }
        }
    },
    bit32: {
        func: {
            band: {
                return: "number",
                params: [{ name: "args", type: "...number" }],
                desc: "Performs a bitwise **AND** on all input numbers.",
                expl: "local result = bit32.band(0b1100, 0b1010) -- 0b1000 (8)"
            },
            extract: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "f", type: "number" }, { name: "w", type: "number?" }],
                desc: "Extracts a field of bits from 'n', starting at position 'f' (0-indexed) with a width 'w' (defaults to 1).",
                expl: "local bits = bit32.extract(0b10110, 2, 3) -- 0b011 (3)"
            },
            byteswap: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Swaps the byte order (endianness) of the 32-bit integer 'n'. **(Luau Extension)**",
                expl: "local swapped = bit32.byteswap(0x12345678) -- 0x78563412"
            },
            bor: {
                return: "number",
                params: [{ name: "args", type: "...number" }],
                desc: "Performs a bitwise **OR** on all input numbers.",
                expl: "local result = bit32.bor(0b1100, 0b1010) -- 0b1110 (14)"
            },
            bnot: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Performs a bitwise **NOT** (inversion) on the number 'n'.",
                expl: "local result = bit32.bnot(0) -- 4294967295 (all bits set)"
            },
            countrz: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Counts the number of **trailing zero** bits (from the least significant bit/right) in 'n'. **(Luau Extension)**",
                expl: "local count = bit32.countrz(0b10100) -- 2"
            },
            bxor: {
                return: "number",
                params: [{ name: "args", type: "...number" }],
                desc: "Performs a bitwise **XOR** (exclusive OR) on all input numbers.",
                expl: "local result = bit32.bxor(0b1100, 0b1010) -- 0b0110 (6)"
            },
            arshift: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "i", type: "number" }],
                desc: "Performs an **arithmetic right shift** of 'n' by 'i' bits. The sign bit (MSB) is propagated during the shift.",
                expl: "local result = bit32.arshift(0xFFFFFFFE, 1) -- -1 >> 1 = -1 (0xFFFFFFFF)"
            },
            rshift: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "i", type: "number" }],
                desc: "Performs a **logical right shift** of 'n' by 'i' bits (fills with zero bits from the left).",
                expl: "local result = bit32.rshift(0b1100, 2) -- 0b0011 (3)"
            },
            rrotate: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "i", type: "number" }],
                desc: "Performs a **right bitwise rotation** of 'n' by 'i' bits.",
                expl: "local result = bit32.rrotate(0b1001, 2) -- 0b0110"
            },
            replace: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "r", type: "number" }, { name: "f", type: "number" }, { name: "w", type: "number?" }],
                desc: "Replaces the bits in 'n' (start 'f', width 'w') with the corresponding lowest bits of 'r'.",
                expl: "local result = bit32.replace(0b11111, 0b000, 1, 3) -- 0b10001 (replaces bits 1, 2, 3 with 0s)"
            },
            lshift: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "i", type: "number" }],
                desc: "Performs a **logical left shift** of 'n' by 'i' bits (fills with zero bits from the right).",
                expl: "local result = bit32.lshift(0b101, 2) -- 0b10100 (20)"
            },
            lrotate: {
                return: "number",
                params: [{ name: "n", type: "number" }, { name: "i", type: "number" }],
                desc: "Performs a **left bitwise rotation** of 'n' by 'i' bits.",
                expl: "local result = bit32.lrotate(0b1001, 2) -- 0b0110"
            },
            btest: {
                return: "boolean",
                params: [{ name: "args", type: "...number" }],
                desc: "Performs a bitwise AND on all inputs and returns **true** if the result is **not zero** (i.e., if at least one common bit is set).",
                expl: "local is_set = bit32.btest(0b100, 0b110) -- true"
            },
            countlz: {
                return: "number",
                params: [{ name: "n", type: "number" }],
                desc: "Counts the number of **leading zero** bits (from the most significant bit/left) in the 32-bit representation of 'n'. **(Luau Extension)**",
                expl: "local count = bit32.countlz(0b101) -- 29 (32 - 3 bits used)"
            }
        }
    },
    LLEvents: {
        func: {
            on: {
                return: "function",
                params: [{ name: "name", type: "string" }, { name: "callback", type: "function" }],
                desc: "The primary way to register an event handler is with LLEvents:on():",
                expl: "LLEvents:on(\"touch_start\", function(detected: {DetectedEvent})\nll.Say(0, `Touched by {detected[1]:getName()}`)\nend)"
            },
            off: {
                return: "boolean",
                params: [{ name: "name", type: "string" }, { name: "handler", type: "function" }],
                desc: "Event registration methods return a handler reference that you can use later to remove the handler:",
                expl: "LLEvents:off(\"touch_start\", handler)"
            },
            once: {
                return: "function",
                params: [{ name: "name", type: "string" }, { name: "callback", type: "function" }],
                desc: "Use LLEvents:once() to register a handler that automatically removes itself after running once:",
                expl: "LLEvents:once(\"touch_start\", function(detected: {DetectedEvent})\nll.Say(0, \"First touch detected!\")\nend)"
            },
            eventNames: {
                return: "table",
                params: [],
                desc: "Returns a list of all event names alocated with LLEvents",
                expl: "local events = LLEvents:eventNames()\nfor i, name in ipairs(events) do\n    print(name)\nend"
            },
            listeners: {
                return: "table",
                params: [{ name: "eventName", type: "string" }],
                desc: "Returns a list of all registered listener functions for a specific event",
                expl: "local touchListeners = LLEvents:listeners(\"touch_start\")\nprint(\"Number of touch listeners: \" .. #touchListeners)"
            }
        }
    },
    LLTimers: {
        func: {
            every: {
                return: "function",
                params: [{ name: "time", type: "number" }, { name: "callback", type: "function" }],
                desc: "Create a timer that fires repeatedly at a specified interval:",
                expl: "local handler = LLTimers:every(0.1, function(scheduled_time, interval)\nll.Say(0, \"Timer fires every 0.1 seconds\")\nend)"
            },
            once: {
                return: "function",
                params: [{ name: "time", type: "number" }, { name: "callback", type: "function" }],
                desc: "Create a timer that fires only once after a delay:",
                expl: "local handler = LLTimers:once(2.0, function(scheduled_time)\nll.Say(0, \"This fires once after 2 seconds\")\nend)"
            },
            off: {
                return: "boolean",
                params: [{ name: "handler", type: "function" }],
                desc: "All timer creation methods return a handler reference that you can use to stop the timer:",
                expl: "local success = LLTimers:off(handler)"
            }
        }
    },
    DetectedEvent: {
        var: {
            index: "The detected index.",
            valid: "Is it valid.",
            canAdjustDamage: "Is Damage enable and can be adjusted."
        },
        func: {
            getRot: {
                return: "quaternion",
                params: [],
                desc: "",
                expl: "detected[1]:getRot()"
            },
            getLinkNumber: {
                return: "integer",
                params: [],
                desc: "",
                expl: "detected[1]:getLinkNumber()"
            },
            getTouchFace: {
                return: "integer",
                params: [],
                desc: "",
                expl: "detected[1]:getTouchFace()"
            },
            getTouchBinormal: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getTouchBinormal()"
            },
            getKey: {
                return: "uuid",
                params: [],
                desc: "",
                expl: "detected[1]:getKey()"
            },
            getGroup: {
                return: "boolean",
                params: [],
                desc: "",
                expl: "detected[1]:getGroup()"
            },
            getGrab: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getGrab()"
            },
            getDamage: {
                return: "float",
                params: [],
                desc: "",
                expl: "detected[1]:getDamage()"
            },
            getTouchNormal: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getTouchNormal()"
            },
            getVel: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getVel()"
            },
            getPos: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getPos()"
            },
            getName: {
                return: "string",
                params: [],
                desc: "",
                expl: "detected[1]:getName()"
            },
            getOwner: {
                return: "uuid",
                params: [],
                desc: "",
                expl: "detected[1]:getOwner()"
            },
            getRezzer: {
                return: "uuid",
                params: [],
                desc: "",
                expl: "detected[1]:getRezzer()"
            },
            getTouchUV: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getTouchUV()"
            },
            getType: {
                return: "integer",
                params: [],
                desc: "",
                expl: "detected[1]:getType()"
            },
            adjustDamage: {
                return: "table",
                params: [],
                desc: "Adjusts the damage value",
                expl: "detected[1]:adjustDamage(10.0)"
            },
            getTouchST: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getTouchST()"
            },
            getTouchPos: {
                return: "vector",
                params: [],
                desc: "",
                expl: "detected[1]:getTouchPos()"
            }
        }
    }
};
