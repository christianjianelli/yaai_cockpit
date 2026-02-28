# ABAP AI tools Cockpit

The ABAP AI tools Cockpit is a frontend tool designed to streamline the creation and management of AI Agents using the ABAP AI tools.

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-home.jpg" alt="Main View" width="600px">
</p>

---

## Main Features

### LLM APIs

Configure the Base URL of the API, register available LLM models, and set the default LLM model.

**Supported APIs:**
- OpenAI
- Anthropic
- Google Gemini
- Mistral
- Ollama

**Example:** Open AI API Settings

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-api.jpg" alt="API Settings" width="600px">
</p>

---

### Tools

Configure the tools available in the system. These tools are used by AI Agents to perform tasks via Function Calling (also known as Tool Calling). In ABAP AI tools, these tools are instance methods of ABAP classes.

For each tool, you can define:
- **Class name**
- **Method name**
- **Proxy class name** (used when a type cast is necessary)
- **Tool description**

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-tools.jpg" alt="Tools" width="600px">
</p>

---

### Documents (RAG)

Upload markdown documents to be used in AI Agents' system instructions or for Retrieval Augmented Generation (RAG), providing context that the LLM model may lack.

For each document, you can set:
- **File name**
- **Description** of the file content
- **Keywords** to help search documents
- **File content** (must be a markdown `.md` file)

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-docs.jpg" alt="Documents (RAG)" width="600px">
</p>

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-doc.jpg" alt="Markdown Document" width="600px">
</p>

---

### Agents

Set up AI Agents with the following options:
- Assign a markdown document containing system instructions
- Assign a markdown document with information not available in the model's training data (RAG)
- Assign tools for the agent to use
- Set parameters such as LLM API, LLM model, model temperature, etc.

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-agents.jpg" alt="AI Agents" width="600px">
</p>

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-agent.jpg" alt="AI Agent" width="600px">
</p>

---

### Chats

Access all information about a chat, including:
- Messages exchanged between the user and the LLM model
- Tools called and their responses
- Sequence Diagram view to visualize message flow and tool usage during task execution
- All logs related to the chat
- Option to resume and continue the conversation from where it stopped

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-chats.jpg" alt="Chats" width="600px">
</p>

**Chat Details**

Messages

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-chat-messages.jpg" alt="Chats Messages width="600px">
</p>

Messages Sequence Diagram

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-chat-sequence-diagram.jpg" alt="Chat Messages Sequence Diagram" width="600px">
</p>

Chat Log

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-chat-log.jpg" alt="Chat Log" width="600px">
</p>

---

### Logs

Access all logged messages in the system.

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-logs.jpg" alt="Logs" width="600px">
</p>

---

### Async Tasks

All chats and tasks executed by AI Agents run as asynchronous processes. In this section, you can view information about these async tasks, such as:
- Task status
- Start date and time
- End date and time

<p style="margin-left: 50px">
   <img src="./docs/images/screenshot-cockpit-async_tasks.jpg" alt="Async Tasks" width="600px">
</p>

---

## Installation

### Prerequisites

The ABAP system must have the following package installed:

 - **[ABAP AI tools](https://github.com/christianjianelli/yaai)**

### Installation Steps

 1 - Clone the [ABAP AI tools Cockpit repository](https://github.com/christianjianelli/yaai_cockpit) in Visual Studio Code or in your Business Application Studio development environment. [This tutorial explains how to do it](https://developers.sap.com/tutorials/build-code-simple-git.html).
 
 2 - Deploy the UI5 Application. See [Deploying SAPUI5 Applications to the SAPUI5 ABAP Repository](https://help.sap.com/docs/ABAP_PLATFORM_NEW/468a97775123488ab3345a0c48cadd8f/a560bd6ed4654fd1b338df065d331872.html?locale=en-US).
