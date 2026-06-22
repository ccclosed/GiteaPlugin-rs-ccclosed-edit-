import json, zlib, base64
from urllib.parse import quote

def generate_drawio_url(mermaid_code):
    encoded = quote(mermaid_code, safe='')
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    raw_deflate = c.compress(encoded.encode('utf-8')) + c.flush()
    data = base64.b64encode(raw_deflate).decode()
    payload = json.dumps({"type": "mermaid", "compressed": True, "data": data})
    return f"https://app.diagrams.net/?pv=0&grid=0#create={quote(payload, safe='')}"

context_diagram = """graph LR
    classDef person fill:#083F72,color:#fff,stroke:#062b4f,stroke-width:2px,rx:25,ry:25,font-weight:bold,font-size:16px;
    classDef system fill:#1168BD,color:#fff,stroke:#0b4884,stroke-width:2px,rx:5,ry:5,font-weight:bold,font-size:16px;

    dev["🧑‍💻 Developer"]:::person
    
    subgraph "CI/CD Pipeline"
        gitea["Gitea Server"]:::system
        bridge["Gitea-Jenkins Bridge"]:::system
        jenkins["Jenkins CI"]:::system
    end

    dev -- "git push" --> gitea
    gitea -- "Webhook POST" --> bridge
    bridge -- "Trigger build" --> jenkins
    
    jenkins -. "Job Status" .-> bridge
    bridge -. "Commit Status" .-> gitea
"""

container_diagram = """graph TD
    classDef external fill:#999999,color:#fff,stroke:#666666,stroke-width:2px,rx:5,ry:5,font-size:14px;
    classDef container fill:#438DD5,color:#fff,stroke:#2b5a88,stroke-width:2px,rx:5,ry:5,font-weight:bold,font-size:14px;

    gitea["Gitea Server"]:::external
    jenkins["Jenkins CI"]:::external

    subgraph "Gitea-Jenkins Bridge (Rust)"
        direction TB
        webhook["Webhook Server (Axum)"]:::container
        logic["Bridge Logic (Domain)"]:::container
        client_j["Jenkins Client (Reqwest)"]:::container
        client_g["Gitea Client (Reqwest)"]:::container
        
        webhook ==>|"Parsed Event"| logic
        logic -->|"JenkinsTriggerReq"| client_j
        logic -->|"GiteaStatusReq"| client_g
    end

    gitea -->|"POST /webhook"| webhook
    jenkins -->|"POST /jenkins-status"| webhook
    
    client_j ==>|"buildWithParameters"| jenkins
    client_g ==>|"POST /statuses/{sha}"| gitea
"""

component_diagram = """graph TD
    classDef container fill:#438DD5,color:#fff,stroke:#2b5a88,stroke-width:2px,rx:5,ry:5,font-size:14px;
    classDef comp fill:#85BBF0,color:#000,stroke:#5b80a4,stroke-width:2px,rx:10,ry:10,font-weight:bold,font-size:14px;

    webhook["Webhook Server"]:::container
    jenkins_client["Jenkins Client"]:::container

    subgraph "Bridge Logic Crate"
        direction TB
        processor["EventProcessor Struct"]:::comp
        push_map["Push Mapper"]:::comp
        pr_map["PR Mapper"]:::comp
        status_map["Status Mapper"]:::comp
    end

    webhook ==>|"Event Payload"| processor
    
    processor -->|"PushEvent"| push_map
    processor -->|"PullRequestEvent"| pr_map
    processor -->|"PipelineStatus"| status_map
    
    push_map -.->|"Map to Jenkins vars"| jenkins_client
    pr_map -.->|"Map to Jenkins vars"| jenkins_client
"""

print(f"**1. Уровень Context:**\n[Открыть System Context в Draw.io]({generate_drawio_url(context_diagram)})\n")
print(f"**2. Уровень Container:**\n[Открыть Container Diagram в Draw.io]({generate_drawio_url(container_diagram)})\n")
print(f"**3. Уровень Component:**\n[Открыть Component Diagram в Draw.io]({generate_drawio_url(component_diagram)})\n")
