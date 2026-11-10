from .base import BaseAgent
from ..schemas.agent_schemas import (
    IntentClassifierOutput,
    PlannerOutput,
    ArchitectOutput,
    DBDesignOutput,
    ApiDesignOutput,
    UIDesignOutput,
    CodeOutput,
    TestOutput,
    ReviewOutput
)

class IntentClassifierAgent(BaseAgent[IntentClassifierOutput]):
    def __init__(self):
        super().__init__(name="intent_classifier", schema_class=IntentClassifierOutput)

class PlannerAgent(BaseAgent[PlannerOutput]):
    def __init__(self):
        super().__init__(name="planner", schema_class=PlannerOutput)

class ArchitectAgent(BaseAgent[ArchitectOutput]):
    def __init__(self):
        super().__init__(name="architect", schema_class=ArchitectOutput)

class DBDesignerAgent(BaseAgent[DBDesignOutput]):
    def __init__(self):
        super().__init__(name="db_designer", schema_class=DBDesignOutput)

class ApiDesignerAgent(BaseAgent[ApiDesignOutput]):
    def __init__(self):
        super().__init__(name="api_designer", schema_class=ApiDesignOutput)

class UIDesignerAgent(BaseAgent[UIDesignOutput]):
    def __init__(self):
        super().__init__(name="ui_designer", schema_class=UIDesignOutput)

class BackendDevAgent(BaseAgent[CodeOutput]):
    def __init__(self):
        super().__init__(name="backend_dev", schema_class=CodeOutput)

class FrontendDevAgent(BaseAgent[CodeOutput]):
    def __init__(self):
        super().__init__(name="frontend_dev", schema_class=CodeOutput)

class TesterAgent(BaseAgent[TestOutput]):
    def __init__(self):
        super().__init__(name="tester", schema_class=TestOutput)

class ReviewerAgent(BaseAgent[ReviewOutput]):
    def __init__(self):
        super().__init__(name="reviewer", schema_class=ReviewOutput)
