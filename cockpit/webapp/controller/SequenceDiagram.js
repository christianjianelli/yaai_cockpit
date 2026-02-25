sap.ui.define([
    "sap/m/MessageToast"
],
    function (MessageToast) {
        "use strict";
        return {

            createMermaidSequenceDiagramOpenAI: function (chat) {

                const roleMap = {
                    developer: "Developer",
                    user: "User",
                    assistant: "Assistant"
                };

                if (!chat.messages) {
                    return "sequenceDiagram\n";
                }

                const messages = chat.messages;

                // Use only a Set to collect participants in order of appearance
                const participantsSet = new Set();

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    let { role, type } = msg;
                    if (type === "function_call" || type === "function_call_output") {
                        participantsSet.add("Assistant");
                        participantsSet.add("Tool");
                    } else if (role) {
                        const mappedRole = roleMap[role] || role;
                        participantsSet.add(mappedRole);
                    }
                }

                let mermaid = "sequenceDiagram\n";

                for (const p of participantsSet) {
                    mermaid += `participant ${p}\n`;
                }

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    let { role, content, type, name, output } = msg;

                    // Tool call
                    if (type === "function_call") {
                        mermaid += `Assistant ->> Tool: Tool call: ${name}\n`;
                    }
                    // Tool response
                    else if (type === "function_call_output") {
                        let out = output;
                        if (typeof out === "string" && out.length > 60) {
                            out = out.slice(0, 57) + "...";
                            out = this._escapeForMermaid(out);
                        }
                        // Replace # with #35;
                        if (typeof out === "string") {
                            //out = out.replace(/#/g, "#35;");
                            out = this._escapeForMermaid(out);
                        }
                        mermaid += `Tool ->> Assistant: Tool response: ${out}\n`;
                    }
                    // Normal message
                    else if (role) {
                        let from = roleMap[role] || role;
                        let to;
                        if (from === "Developer") to = "Assistant";
                        else if (from === "User") to = "Assistant";
                        else if (from === "Assistant") to = "User";
                        let msgContent = content.replace(/\r?\n/g, " ");
                        if (msgContent.length > 60) {
                            msgContent = msgContent.slice(0, 57) + "...";
                            msgContent = this._escapeForMermaid(msgContent);
                        }
                        // Replace # with #35;
                        //msgContent = msgContent.replace(/#/g, "#35;");
                        msgContent = this._escapeForMermaid(msgContent);
                        mermaid += `${from} ->> ${to}: ${msgContent}\n`;
                    }
                }
                return mermaid;
            },

            createMermaidSequenceDiagramAnthropic: function (chat) {

                const roleMap = {
                    system: "System",
                    user: "User",
                    assistant: "Assistant"
                };

                if (!chat.messages) {
                    return "sequenceDiagram\n";
                }

                const messages = chat.messages;

                // Use only a Set to collect participants in order of appearance
                const participantsSet = new Set();

                for (const msgObj of messages) {
                    let msg;
                    let content;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    
                    let { role } = msg;
                    const mappedRole = roleMap[role] || role;
                    participantsSet.add(mappedRole);

                    try {
                        content = JSON.parse(msg.content);
                    } catch {
                        //No problem ...
                    }

                    if (Array.isArray(content)) {

                        content.forEach(element => {

                            if (element.type === "tool_use" || element.type === "tool_result") {
                                participantsSet.add("Assistant");
                                participantsSet.add("Tool");
                            }
                            
                        });

                    }
                    
                }

                let mermaid = "sequenceDiagram\n";

                for (const p of participantsSet) {
                    mermaid += `participant ${p}\n`;
                }

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    let { role, content } = msg;

                    try {
                        content = JSON.parse(msg.content);
                    } catch {
                        //No problem ...
                    }

                    //The default content type is text 
                    if (!Array.isArray(content)) {
                        content = [{
                            type: "text",
                            text: content
                        }];
                    }

                    content.forEach(element => {
                        // Tool call
                        if (element.type === "tool_use") {
                            mermaid += `Assistant ->> Tool: Tool call: ${element.name}\n`;
                        }
                        // Tool response
                        else if (element.type === "tool_result") {
                            let out = element.content;
                            if (typeof out === "string" && out.length > 60) {
                                out = out.slice(0, 57) + "...";
                                out = this._escapeForMermaid(out);
                            }
                            // Replace # with #35;
                            if (typeof out === "string") {
                                //out = out.replace(/#/g, "#35;");
                                out = this._escapeForMermaid(out);
                            }
                            mermaid += `Tool ->> Assistant: Tool response: ${out}\n`;
                        }
                        // Normal message
                        else if (role) {
                            let from = roleMap[role] || role;
                            let to;
                            if (from === "User") to = "Assistant";
                            else if (from === "System") to = "Assistant";
                            else if (from === "Assistant") to = "User";
                            let msgContent = element.text;
                            msgContent = this._escapeForMermaid(msgContent);
                            //let msgContent = element.text.replace(/\r?\n/g, " ");
                            if (msgContent.length > 60) {
                                msgContent = msgContent.slice(0, 57) + "...";
                            }
                            // Replace # with #35;
                            //msgContent = msgContent.replace(/#/g, "#35;");
                            mermaid += `${from} ->> ${to}: ${msgContent}\n`;
                        }

                    });
                }
                return mermaid;

            },

            createMermaidSequenceDiagramGoogle: function (chat) {

                const roleMap = {
                    system: "System",
                    user: "User",
                    model: "Model"
                };

                if (!chat.messages) {
                    return "sequenceDiagram\n";
                }

                const messages = chat.messages;

                // Use only a Set to collect participants in order of appearance
                const participantsSet = new Set();

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    
                    let { role, parts } = msg;
                    const mappedRole = roleMap[role] || role;
                    participantsSet.add(mappedRole);

                    try {
                        parts = JSON.parse(parts);
                    } catch {
                        //No problem ...
                    }

                    if (Array.isArray(parts)) {

                        parts.forEach(element => {

                            if (element.function_call || element.function_response) {
                                participantsSet.add("Model");
                                participantsSet.add("Tool");
                            }
                            
                        });

                    }
                    
                }

                let mermaid = "sequenceDiagram\n";

                for (const p of participantsSet) {
                    mermaid += `participant ${p}\n`;
                }

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    let { role, parts } = msg;

                    try {
                        parts = JSON.parse(parts);
                    } catch {
                        //No problem ...
                    }

                    if (Array.isArray(parts)) {

                        parts.forEach(element => {
                            // Tool call
                            if (element.function_call) {
                                mermaid += `Model ->> Tool: Tool call: ${element.function_call.name}\n`;
                            }
                            // Tool response
                            else if (element.function_response) {
                                let out = element.function_response.response.text;
                                if (typeof out === "string" && out.length > 60) {
                                    out = out.slice(0, 57) + "...";
                                    out = this._escapeForMermaid(out);
                                }
                                // Replace # with #35;
                                if (typeof out === "string") {
                                    //out = out.replace(/#/g, "#35;");
                                    out = this._escapeForMermaid(out);
                                }
                                mermaid += `Tool ->> Model: Tool response: ${out}\n`;
                            }
                            // Normal message
                            else if (role) {
                                let from = roleMap[role] || role;
                                let to;
                                if (from === "User") to = "Model";
                                else if (from === "System") to = "Model";
                                else if (from === "Model") to = "User";
                                let msgContent = element.text;
                                msgContent = this._escapeForMermaid(msgContent);
                                //let msgContent = element.text.replace(/\r?\n/g, " ");
                                if (msgContent.length > 60) {
                                    msgContent = msgContent.slice(0, 57) + "...";
                                }
                                // Replace # with #35;
                                //msgContent = msgContent.replace(/#/g, "#35;");
                                mermaid += `${from} ->> ${to}: ${msgContent}\n`;
                            }

                        });

                    }

                }
                return mermaid;

            },

            createMermaidSequenceDiagramOllama: function (chat) {

                const roleMap = {
                    system: "System",
                    user: "User",
                    assistant: "Assistant"
                };

                if (!chat.messages) {
                    return "sequenceDiagram\n";
                }

                const messages = chat.messages;

                // Use only a Set to collect participants in order of appearance
                const participantsSet = new Set();

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    let { role, type } = msg;
                    if (type === "function_call" || type === "function_call_output") {
                        participantsSet.add("Assistant");
                        participantsSet.add("Tool");
                    } else if (role) {
                        const mappedRole = roleMap[role] || role;
                        participantsSet.add(mappedRole);
                    }
                }

                let mermaid = "sequenceDiagram\n";

                for (const p of participantsSet) {
                    mermaid += `participant ${p}\n`;
                }

                for (const msgObj of messages) {
                    let msg;
                    try {
                        msg = JSON.parse(msgObj.msg);
                    } catch {
                        continue;
                    }
                    let { role, content, type, name, output } = msg;

                    // Tool call
                    if (type === "function_call") {
                        mermaid += `Assistant ->> Tool: Tool call: ${name}\n`;
                    }
                    // Tool response
                    else if (type === "function_call_output") {
                        let out = output;
                        if (typeof out === "string" && out.length > 60) {
                            out = out.slice(0, 57) + "...";
                            out = this._escapeForMermaid(out);
                        }
                        // Replace # with #35;
                        if (typeof out === "string") {
                            //out = out.replace(/#/g, "#35;");
                            out = this._escapeForMermaid(out);
                        }
                        mermaid += `Tool ->> Assistant: Tool response: ${out}\n`;
                    }
                    // Normal message
                    else if (role) {
                        let from = roleMap[role] || role;
                        let to;
                        if (from === "System") to = "Assistant";
                        else if (from === "User") to = "Assistant";
                        else if (from === "Assistant") to = "User";
                        let msgContent = content.replace(/\r?\n/g, " ");
                        if (msgContent.length > 60) {
                            msgContent = msgContent.slice(0, 57) + "...";
                            msgContent = this._escapeForMermaid(msgContent);
                        }
                        // Replace # with #35;
                        //msgContent = msgContent.replace(/#/g, "#35;");
                        msgContent = this._escapeForMermaid(msgContent);
                        mermaid += `${from} ->> ${to}: ${msgContent}\n`;
                    }
                }
                return mermaid;
            },
            
            //################ Private APIs ###################
            _escapeForMermaid: function(text) {
                return text.replace(/[&<>();#\n\r]/g, "");
            }

        };
    });