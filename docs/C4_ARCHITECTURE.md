# Архитектура в нотации C4 (C4 Model)

В данном документе описана архитектура моста `gitea-plugin-rs` с использованием подхода [C4 Model](https://c4model.com/), визуализированная через Mermaid.

## Уровень 1: System Context (Контекст системы)
Показывает высокоуровневое взаимодействие системы со своими внешними зависимостями и пользователями.

```mermaid
C4Context
    title System Context diagram for Gitea-Jenkins Bridge

    Person(developer, "Developer", "Разработчик, пишущий и пушащий код")
    
    System(gitea, "Gitea", "Система контроля версий и хостинг кода (Git)")
    System(jenkins, "Jenkins CI", "Сервер непрерывной интеграции")
    
    System(bridge, "Gitea-Jenkins Bridge", "Наш Rust-middleware. Интегрирует Gitea и Jenkins без плагинов внутри JVM.")

    Rel(developer, gitea, "Пушит код в репозиторий", "Git/SSH/HTTPS")
    Rel(gitea, bridge, "Отправляет Webhook о новых событиях", "HTTPS")
    Rel(bridge, jenkins, "Триггерит джобы, передает параметры сборки", "HTTPS/REST")
    
    Rel(jenkins, bridge, "Сообщает о начале/окончании сборки", "HTTPS/REST")
    Rel(bridge, gitea, "Обновляет Commit Status (крестик/галочка)", "HTTPS/REST")
```

## Уровень 2: Container (Контейнеры системы)
Раскрывает архитектуру самого моста, показывая его основные контейнеры (в нашем случае это логические крейты Rust, запускаемые в одном процессе/контейнере Docker).

```mermaid
C4Container
    title Container diagram for Gitea-Jenkins Bridge

    System_Ext(gitea, "Gitea", "Git server")
    System_Ext(jenkins, "Jenkins", "CI server")

    System_Boundary(bridge_system, "Gitea-Jenkins Bridge (Rust Process)") {
        Container(webhook_server, "Webhook Server", "Rust, Axum, Tokio", "Слушает порт. Принимает HTTP запросы, проверяет HMAC X-Gitea-Signature.")
        Container(bridge_logic, "Bridge Logic (Domain)", "Rust", "Чистая бизнес-логика. Парсит Payload, принимает решения, маппит события в параметры сборки.")
        Container(jenkins_client, "Jenkins Client", "Rust, Reqwest", "HTTP Клиент. Хранит JSESSIONID cookie, получает CSRF crumbs, запускает BuildWithParameters.")
        Container(gitea_client, "Gitea Client", "Rust, Reqwest", "HTTP Клиент. Отвечает за вызовы Gitea API (например, отправка Commit Status).")
    }

    Rel(gitea, webhook_server, "POST Webhooks (Push, PR)", "JSON/HTTPS")
    Rel(jenkins, webhook_server, "POST Pipeline Status", "JSON/HTTPS")
    
    Rel(webhook_server, bridge_logic, "Передает десериализованные события")
    Rel(bridge_logic, jenkins_client, "Запрашивает запуск Jenkins Job")
    Rel(bridge_logic, gitea_client, "Запрашивает обновление статуса в Gitea")
    
    Rel(jenkins_client, jenkins, "API Call: /job/{name}/buildWithParameters", "HTTPS")
    Rel(gitea_client, gitea, "API Call: /api/v1/repos/{owner}/{repo}/statuses/{sha}", "HTTPS")
```

## Уровень 3: Component (Компоненты)
Демонстрирует внутреннюю структуру главного слоя бизнес-логики (`bridge-logic`).

```mermaid
C4Component
    title Component diagram for bridge-logic crate

    Container_Boundary(bridge_logic, "Bridge Logic") {
        Component(processor, "EventProcessor", "struct", "Точка входа. Определяет тип события (PushEvent, PullRequestEvent) и вызывает нужный маппер.")
        Component(push_mapper, "Push Mapper", "function", "Преобразует PushEvent в параметры (BRANCH_NAME, COMMIT_SHA).")
        Component(pr_mapper, "PR Mapper", "function", "Преобразует PullRequestEvent в параметры (PR_ID, BASE_BRANCH).")
        Component(status_mapper, "Status Mapper", "function", "Преобразует внутренний JenkinsStatusRequest в Gitea Commit Status.")
    }

    Container(webhook_server, "Webhook Server", "Rust/Axum", "Передает данные из HTTP слоя")
    Container(jenkins_client, "Jenkins Client", "Rust/Reqwest", "Ожидает команды на запуск")

    Rel(webhook_server, processor, "Вызывает process_push_event()")
    Rel(processor, push_mapper, "Делегирует маппинг")
    Rel(push_mapper, jenkins_client, "Возвращает структуру JenkinsTriggerRequest для клиента")
```

> **Примечание:** Уровень 4 (Code) в C4 обычно не рисуется, так как он слишком детализирован, и его роль выполняют UML диаграммы классов или сам исходный код. В Rust эту роль отлично выполняет `cargo doc`.
