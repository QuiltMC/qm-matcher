/*
 * Utilities to deal with class files since java-class-tools is a bit barebone.
 */

import JSZip from "jszip";
import { Modifier } from "java-class-tools";
import * as enigma from "./enigma_mappings.mjs";
import * as java from "./java.mjs"
import * as fs from "fs";

const TEXT_DECODER = new TextDecoder();

export function load_file(path) {
    return new JarFile(new JSZip(fs.readFileSync(path), {base64: false, checkCRC32: false}));
}

export class JarFile {
    classes = [];

    constructor(zip) {
        this.jar = zip;
    }

    /**
     * Loads the given class file from this JAR file.
     *
     * @param {enigma.Class|string} clazz the class to load
     * @returns 
     */
    load_class(clazz) {
        if (clazz instanceof enigma.Class) {
            clazz = clazz.toString();
        }

        if (this.classes[clazz])
            return this.classes[clazz];

        const path = clazz + ".class";
        const file = this.jar.files[path];

        return this.classes[clazz] = new ClassFile(java.CLASS_FILE_READER.read(file._data.getContent()));
    }
}

export class ClassFile {
    _methods = undefined;

    constructor(class_file) {
        this.class_file = class_file;
    }

    find_method(name, descriptor) {
        if (!this._methods) {
            this._methods = this.class_file.methods.map(class_method => {
                const name = TEXT_DECODER.decode(new Uint8Array(this.class_file.constant_pool[class_method.name_index].bytes));
                const raw_descriptor = TEXT_DECODER.decode(new Uint8Array(this.class_file.constant_pool[class_method.descriptor_index].bytes));
                const descriptor = java.parse_function_descriptor(raw_descriptor);
    
                return new ClassMethod(this, name, descriptor, class_method);
            });
        }

        return this._methods.find(class_method => name === class_method.name && descriptor.equals(class_method.descriptor));
    }

    find_method_from_enigma(method) {
        return this.find_method(method.intermediary, method.descriptor);
    }
}

export class ClassMethod {
    constructor(owner, name, descriptor, raw) {
        this.owner = owner;
        this.name = name;
        this.descriptor = descriptor;
        this.raw = raw;
    }

    is_static() {
        return (this.raw.access_flags & Modifier.STATIC) > 0;
    }

    attribute_names() {
        return this.raw.attributes.map(attr => {
            const name = TEXT_DECODER.decode(new Uint8Array(this.owner.class_file.constant_pool[attr.attribute_name_index].bytes));
            return name;
        })
    }
}
