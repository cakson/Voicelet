# Feature Specification: Guild Administration UI

**Feature Branch**: `010-guild-administration-ui`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "Create a simple unauthenticated web administration interface for registering Discord guilds and managing their persisted Voicelet configuration, enabled state, and deletion."

## Clarifications

### Session 2026-09-03

- Q: How should existing persisted guild configurations become guild registrations when this feature is deployed? → A: Require each existing configured guild to be manually registered in the new interface; production is expected to start with a clean datastore.
- Q: How should the unauthenticated administration page be isolated from public traffic in the deployed application? → A: Serve it on the existing operational HTTP listener; operators restrict access through their network proxy or firewall.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Understand Guilds (Priority: P1)

As an operator, I can open one administration page, see every registered Discord guild and its
configuration state, and register another guild so that Voicelet's managed guilds are explicit and
understandable.

**Why this priority**: Registration and a trustworthy overview establish the inventory on which all
other administration actions depend.

**Independent Test**: Open the page against empty isolated persistence, register a valid guild
without configuration, and verify that it appears once and is clearly marked unconfigured and
inactive.

**Acceptance Scenarios**:

1. **Given** registered guilds in persistent storage, **When** an operator opens the administration
   page, **Then** every registered guild is listed with its identifier, configured or unconfigured
   status, enabled or disabled status where applicable, and actions appropriate to that state.
2. **Given** a structurally valid unregistered guild identifier, **When** the operator registers it
   without completing configuration, **Then** the registration persists and the list identifies the
   guild as unconfigured and inactive.
3. **Given** a structurally valid unregistered guild identifier and valid configuration values,
   **When** the operator registers and configures it in the same flow, **Then** the guild and its
   enabled configuration persist and the list shows the configured state.
4. **Given** an already registered guild identifier, **When** the operator attempts to register it
   again, **Then** the operation is rejected clearly and the existing registration and configuration
   remain unchanged.
5. **Given** an invalid guild identifier, **When** registration is submitted, **Then** validation is
   shown in understandable terms and no registration or configuration is persisted.
6. **Given** registration or its requested initial configuration cannot be completed, **When** the
   failure is reported, **Then** the page shows the actual persisted state and does not claim that
   an uncompleted operation succeeded.

---

### User Story 2 - Create and Inspect Configuration (Priority: P1)

As an operator, I can add configuration to a registered guild and inspect its saved values so that I
can verify the settings Voicelet will use.

**Why this priority**: A registration becomes operationally useful only after its required behavior
has been configured and can be checked without inspecting raw storage.

**Independent Test**: Register a guild without configuration, use its add-configuration action,
save valid values, and verify that the persisted values and enabled state are shown in the list and
configuration view.

**Acceptance Scenarios**:

1. **Given** a registered guild without configuration, **When** an operator selects add
   configuration, **Then** all current guild-specific settings are presented and required fields are
   identified.
2. **Given** valid values for every required setting, **When** the operator saves a new
   configuration, **Then** the configuration persists, success is clear, and the refreshed guild
   state is configured and enabled.
3. **Given** missing or invalid values, **When** the operator attempts to save, **Then** the values
   are rejected before replacement, actionable validation feedback is displayed, and the guild
   remains unconfigured.
4. **Given** a configured guild, **When** the operator views it, **Then** the page displays the
   persisted trigger voice channel, temporary-room category, inactivity timeout, reconciliation
   interval, protected permanent-channel identifiers, and enabled state.
5. **Given** configuration persistence fails, **When** save returns, **Then** the failure is shown in
   understandable terms, no success is claimed, and a refreshed view reflects only persisted state.

---

### User Story 3 - Edit and Activate Configuration (Priority: P1)

As an operator, I can edit saved settings and enable or disable a guild configuration so that I can
change or pause Voicelet behavior without losing configuration.

**Why this priority**: Safe ongoing operation requires both correction of settings and a reversible
way to stop guild-specific behavior.

**Independent Test**: Begin from a configured guild, change a value, disable the configuration,
restart against the same persistence, verify all values remain while behavior is inactive, then
re-enable it and verify normal behavior resumes.

**Acceptance Scenarios**:

1. **Given** a configured guild, **When** editing begins, **Then** the form starts with all currently
   persisted values and enabled state.
2. **Given** a valid edit, **When** the operator saves it, **Then** the complete new configuration
   replaces the old configuration and the page shows the persisted replacement.
3. **Given** an invalid edit or failed update, **When** save returns, **Then** the previous valid
   persisted configuration remains available and the failure is displayed clearly.
4. **Given** an edit in progress, **When** the operator cancels, **Then** no configuration value or
   enabled state changes.
5. **Given** an enabled configuration, **When** the operator disables it, **Then** the registration
   and all configuration values remain persisted and visible while guild-specific product behavior
   stops for that guild.
6. **Given** a disabled configuration, **When** the application restarts or redeploys, **Then** the
   configuration remains disabled with the same saved values.
7. **Given** a disabled valid configuration, **When** the operator re-enables it, **Then** normal
   guild-specific behavior resumes using the saved values without reconfiguration.

---

### User Story 4 - Permanently Delete a Guild (Priority: P2)

As an operator, I can permanently delete a guild registration after explicit confirmation so that
Voicelet forgets that guild and its configuration without changing anything in Discord.

**Why this priority**: Operators need lifecycle control, but deletion follows the safer and more
frequent registration, configuration, and disable flows.

**Independent Test**: Register two guilds, configure one, confirm deletion of that guild, and verify
its registration and configuration are gone while the other guild and all Discord-side resources
are unchanged.

**Acceptance Scenarios**:

1. **Given** any registered guild, **When** the operator initiates deletion, **Then** the interface
   identifies the action as destructive and requires explicit confirmation before removing data.
2. **Given** an unconfigured, configured, or disabled guild, **When** deletion is confirmed and
   succeeds, **Then** its registration and any configuration are removed together and it disappears
   from the refreshed list.
3. **Given** deletion succeeds, **When** Voicelet later encounters that guild, **Then** it treats the
   guild as unregistered and unconfigured and performs no guild-specific behavior.
4. **Given** one guild is deleted, **When** other registrations are inspected, **Then** their
   registrations and configurations are unchanged.
5. **Given** deletion fails, **When** the result is shown, **Then** the operator sees a clear failure
   and the interface refreshes from persistence rather than presenting assumed or partial state.
6. **Given** a previously deleted Discord guild, **When** it is registered again, **Then** it is a
   new unconfigured registration unless new configuration is supplied during registration.
7. **Given** deletion is confirmed, **When** Voicelet removes its persisted data, **Then** no Discord
   channels, categories, guilds, or other Discord-side resources are modified or deleted.

### Edge Cases

- A guild identifier is empty, contains whitespace or non-digit characters, has an invalid length,
  or falls outside the valid Discord identifier range; registration is rejected without a write.
- Two operators or requests attempt to register the same guild concurrently; at most one succeeds
  and only one registration exists.
- A registration is submitted with optional initial configuration that is incomplete or invalid;
  neither the registration nor configuration is reported as successfully created.
- Stored configuration disappears or changes between list display and a view, edit, toggle, or
  delete action; the action returns a clear conflict or current-state result and the page refreshes.
- A save, toggle, or delete response is lost or persistence becomes unavailable; the interface does
  not infer success and reloads authoritative persisted state when possible.
- Configuration identifiers are structurally valid but reference deleted, wrong-type, or foreign
  Discord resources; existing safe use-time verification prevents product behavior from proceeding.
- A registered guild has no configuration; it has no enabled state and is treated as inactive rather
  than as a disabled configured guild.
- The guild list is empty; the page explains that no guilds are registered and keeps registration
  directly available.
- Browser input or provider failures contain sensitive or raw internal detail; displayed errors are
  bounded and safe, and no token, credential, raw record, stack trace, or raw Discord payload is
  exposed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voicelet MUST provide a web administration page that lists every persisted guild
  registration and exposes state-appropriate registration, configuration, enable/disable, and
  deletion actions.
- **FR-002**: A guild registration MUST persist a structurally valid Discord guild identifier
  independently of whether configuration exists.
- **FR-003**: Guild identifiers MUST be validated before persistence is attempted; invalid values
  MUST produce safe, understandable feedback and MUST NOT create or change persisted state.
- **FR-004**: Voicelet MUST prevent duplicate registration of the same guild, including concurrent
  duplicate attempts, without changing the original registration or configuration.
- **FR-005**: The registration flow MUST prompt the operator to configure Voicelet and MUST allow
  either completion of configuration or explicit deferral until later.
- **FR-006**: Registering with deferred configuration MUST persist an unconfigured registration and
  MUST clearly identify it as unconfigured and inactive.
- **FR-007**: Registering with initial configuration MUST create the registration and configuration
  as one complete outcome; a failed or invalid initial configuration MUST NOT leave the interface
  claiming that both were created, and persisted state MUST be re-read before presenting the result.
- **FR-008**: Each guild list entry MUST show the guild identifier, whether configuration exists,
  whether existing configuration is enabled or disabled, and actions appropriate to its current
  state.
- **FR-009**: An unconfigured guild MUST provide an add-configuration action; a configured guild
  MUST provide view-configuration and edit-configuration actions; every registration MUST provide a
  delete action.
- **FR-010**: The guild list MUST reflect authoritative persisted changes after registration,
  configuration creation or replacement, enable/disable, and deletion.
- **FR-011**: Operators MUST be able to create configuration only for a registered guild and inspect
  the current persisted configuration for any configured guild.
- **FR-012**: Configuration management MUST expose all current guild-specific Voicelet settings:
  trigger voice channel identifier, temporary-room category identifier, inactivity timeout,
  reconciliation interval, and protected permanent-channel identifiers.
- **FR-013**: Forms MUST identify required values and validate all supported configuration rules
  before attempting a save; invalid input MUST NOT create configuration or replace valid persisted
  configuration.
- **FR-014**: A newly created configuration MUST default to enabled unless the operator explicitly
  chooses disabled during creation.
- **FR-015**: A configuration view MUST display the persisted values actually used by Voicelet and
  clearly identify whether the configuration is enabled or disabled.
- **FR-016**: Editing MUST begin from the current persisted values, support every exposed setting,
  and replace the prior configuration only after the complete replacement passes validation and is
  persisted successfully.
- **FR-017**: Cancelling an edit MUST leave persisted values and enabled state unchanged; failed or
  invalid updates MUST preserve the previous valid configuration and show clear feedback.
- **FR-018**: Voicelet MUST persist an enabled or disabled state for every guild configuration and
  provide a simple control that changes this state without deleting registration or configuration
  values.
- **FR-019**: Disabled configuration MUST remain visible and editable, survive restart and
  redeployment, and be re-enableable without recreating its saved values.
- **FR-020**: All guild-specific product behavior MUST use only valid, enabled configuration.
  Unregistered, unconfigured, disabled, deleted, invalid, or unavailable configuration MUST safely
  skip that behavior without crashing the worker.
- **FR-021**: Re-enabling valid configuration MUST restore normal guild-specific behavior using its
  persisted values, including existing temporary voice-room creation behavior.
- **FR-022**: Guild deletion MUST be visually distinguished from enable/disable and MUST require an
  explicit confirmation that identifies the registration and associated configuration as
  permanently removed.
- **FR-023**: Successful deletion MUST remove the selected registration and its associated
  configuration as one application-owned operation without changing any other guild's state.
- **FR-024**: Deletion MUST NOT modify or delete the Discord guild, Discord channels, Discord
  categories, or any other Discord-side resource.
- **FR-025**: After deletion, Voicelet MUST treat the guild as unregistered and unconfigured; later
  registration of the same identifier MUST create a new registration with no former configuration.
- **FR-026**: Failed registration, save, toggle, or deletion operations MUST present understandable,
  bounded failure feedback, MUST NOT claim success, and MUST refresh from authoritative persisted
  state when the result could otherwise be misleading.
- **FR-027**: Registration and configuration management MUST use application-owned capabilities and
  the existing provider-independent persistence boundary; user-interface behavior MUST NOT access
  persistence directly or introduce provider-specific concepts into application or domain behavior.
- **FR-028**: The administration interface MUST NOT display or expose the Discord bot token,
  persistence or deployment credentials, raw Discord data, raw persisted records, raw provider
  errors, internal stack traces, or other secrets.
- **FR-029**: The administration interface MUST be served without authentication or authorization
  for this feature on Voicelet's existing operational HTTP listener, and documentation MUST
  prominently warn that it is unauthenticated and MUST NOT be exposed directly to the public
  internet.
- **FR-030**: Documentation MUST instruct operators to place the administration endpoint behind a
  VPN or equivalent private network boundary in production or any internet-exposed environment.
- **FR-031**: Documentation MUST explain how to access and serve the interface locally and in a
  deployed application; register, configure, enable, disable, and permanently delete a guild; and
  clarify that deletion removes Voicelet data but no Discord-side resources.
- **FR-032**: Automated unit tests MUST cover administration use cases and validation rules;
  integration tests MUST cover persistent registration, configuration, enabled state, and deletion;
  and end-to-end tests MUST exercise the administration interface using isolated test persistence.
- **FR-033**: Automated tests MUST cover registration, duplicate and invalid registration,
  registration with and without immediate configuration, later configuration, view and edit,
  invalid updates, disable and re-enable, restart persistence, every configured state at deletion,
  deletion isolation and configuration removal, and re-registration after deletion.
- **FR-034**: Administration tests MUST NOT require production Discord, persistence, or deployment
  credentials, and existing worker and Discord Gateway behavior MUST remain regression-tested.
- **FR-035**: Important administration failures MUST be observable through privacy-safe bounded
  outcomes without guild identifiers, submitted values, secrets, raw Discord payloads, or provider
  error detail in logs or telemetry.
- **FR-036**: Guild configuration records MUST NOT implicitly create registrations. A pre-existing
  configuration without an explicit registration MUST be treated as inactive until an operator
  registers that guild; production deployment is expected to begin with a clean datastore.

### Key Entities

- **Guild Registration**: A durable declaration that one structurally valid Discord guild identifier
  is managed by Voicelet. It may exist without configuration and owns at most one guild
  configuration.
- **Guild Configuration**: The complete persisted settings for one registered guild: trigger voice
  channel, temporary-room category, inactivity timeout, reconciliation interval, protected
  permanent-channel identifiers, and enabled state.
- **Configuration State**: The operator-facing distinction among unconfigured, configured and
  enabled, and configured and disabled. Unconfigured registrations have no enabled state and are
  inactive.
- **Administration Operation Result**: A safe result for register, save, toggle, or delete that
  distinguishes success, validation or conflict, and operational failure without exposing provider
  details or secrets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability testing, at least 90% of operators can register a guild without
  configuration and correctly identify its state in under 2 minutes without inspecting raw data.
- **SC-002**: In usability testing, at least 90% of operators can create, view, and edit a guild's
  supported configuration in under 3 minutes and accurately verify all persisted values shown.
- **SC-003**: Across automated scenarios, 100% of invalid and duplicate registration attempts and
  invalid configuration updates leave previously persisted valid state unchanged.
- **SC-004**: Across automated restart scenarios, 100% of configured guilds retain their saved
  values and enabled or disabled state, and disabled guilds perform no guild-specific behavior.
- **SC-005**: Across automated deletion scenarios for unconfigured, enabled, and disabled guilds,
  100% remove only the selected registration and configuration, preserve other guilds, and modify no
  Discord-side resources.
- **SC-006**: After each successful administration action, the updated state is visible on the next
  page display; after each failed or uncertain action, no success state is displayed unless confirmed
  by persisted data.
- **SC-007**: All required administration unit, integration, end-to-end, worker, and Discord Gateway
  regression tests pass using isolated test data and no production credentials.
- **SC-008**: A documentation review confirms that every access and management workflow is described
  and that the unauthenticated-interface and private-network warnings are prominent and unambiguous.

## Assumptions

- Operators know the Discord guild, channel, and category identifiers they intend to enter; automatic
  discovery and Discord membership verification remain out of scope.
- The existing guild-configuration validation rules and defaults remain authoritative, including
  whole-minute interval limits and uniqueness of protected permanent-channel identifiers.
- A newly created configuration is enabled by default because configuration is normally created to
  activate Voicelet; operators may disable it immediately or choose disabled during creation.
- Registration with requested initial configuration is treated as one operator outcome. If the
  combined operation cannot complete, the interface reloads persisted state and does not imply that
  configuration exists.
- This initial interface targets an operator using a conventional desktop browser; advanced
  dashboard behavior, analytics, multi-user coordination, and mobile-specific optimization are out
  of scope.
- The administration page shares Voicelet's existing operational HTTP listener. Network-level access
  control through a proxy, firewall, VPN, or equivalent private network is an operator deployment
  responsibility until a future feature adds authentication and authorization.
- Production deployment is expected to begin with a clean datastore. Any pre-existing configuration
  used outside production requires explicit guild registration and is not automatically migrated into
  a registration.

## Out of Scope

- Authentication, authorization, user accounts, role-based access control, and multi-user
  administration.
- Discord OAuth login, discovering guilds from a Discord account, installing the Voicelet bot, or
  verifying bot membership during registration.
- Automatic discovery of Discord channels or categories.
- Configuration history, audit logs, analytics, advanced dashboards, and temporary-room lifecycle
  management.
