import { error, type_error } from "../../../../error.js";
import { kind_of } from "../../../../functions.js";
import { xnode } from "./xnode.js";

const XML_HEADER = `<?xml version="1.0" encoding="utf-8"?>`;

const XSLTDOC = new DOMParser().parseFromString(
    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:template match="para[content-style][not(text())]"> 
        <xsl:value-of select="normalize-space(.)"/>
    </xsl:template>
    <xsl:template match="node()|@*">
        <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
    </xsl:template>
    <xsl:output indent="yes"/>
</xsl:stylesheet>`, 'application/xml');

export class xdoc {
    #version;
    #encoding;
    #standalone;
    #doc = null;
    #root = null;

    constructor(version = '1.0', encoding = 'UTF-8', standalone = false) {
        this.#doc = document.implementation.createDocument(null, null, null);
        this.#version = version;
        this.#encoding = encoding.toUpperCase();
        this.#standalone = standalone;
    };

    get kind() { return `xdoc`; };

    get version() { return this.#version; };
    set version(x) {
        if (kind_of(x) !== `string`) throw new type_error(`XML version must be of string type.`);
        this.#version = x;
    };

    get encoding() { return this.#encoding; };
    set encoding(x) {
        if (kind_of(x) !== `string`) throw new type_error(`XML encoding must be of string type.`);
        this.#encoding = x.toUpperCase();
    };

    get standalone() { return this.#standalone; };
    set standalone(x) {
        if (kind_of(x) !== `boolean`) throw new type_error(`Standalone must be of type boolean`);
        this.#standalone = x;
    };

    get root() { return this.#root; };
    set root(x) {
        if (x !== null && kind_of(x) !== `xnode`) throw new type_error(`root must be of type xnode`);
        this.#root = x;
    };

    /**
     * Parses the XML content from a string and initializes the xdoc object with the parsed XML document.
     * @param {String} txt - The XML content in string format to be parsed.
     * @throws {error} - Throws an error if the provided XML content is invalid.
     */
    parse_from_string(txt) {
        this.#doc = new DOMParser().parseFromString(txt, `text/xml`);
        const errn = this.#doc.querySelector("parsererror");
        if (errn) throw new error(errn.textContent);
        this.#root = new xnode(this.#doc.documentElement);
    };

    /**
     * Returns the XML content of the xdoc object as a string, optionally including the XML declaration.
     * @param {Boolean} declaration - Indicates whether to include the XML declaration. Defaults to true.
     * @throws {error} - Throws an error if the document is empty.
     * @returns {String} - The XML content as a string, with or without the XML declaration based on the 'declaration' parameter.
     */
    string(declaration = true) {
        if (!this.#root) throw new error(`Document is empty.`);
        
        // Create a new XML document
        const new_doc = document.implementation.createDocument(null, null, null);
        new_doc.appendChild(this.#root.xml(new_doc));
        
        // Serialize without XSLT transformation to preserve CDATA
        const serialized = new XMLSerializer().serializeToString(new_doc);
        
        // Add declaration if requested
        const standalone_attr = this.#standalone ? ' standalone="yes"' : '';
        const header = `<?xml version="${this.#version}" encoding="${this.#encoding}"${standalone_attr}?>`;
        
        return `${declaration ? `${header}\n` : ``}${serialized}`;
    };

    /**
     * Returns the XML representation of the xdoc object as an XMLDocument.
     * @throws {error} - Throws an error if the document is empty.
     * @returns {XMLDocument} - The XML representation of the xdoc object as an XMLDocument.
     */
    xml() {
        if (!this.#root) throw new error(`Document is empty.`);
        const new_doc = document.implementation.createDocument(null, null, null);
        new_doc.appendChild(this.#root.xml(new_doc));
        return new_doc;
    };

};
