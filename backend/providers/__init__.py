from .base import MTProvider
from .dummy import DummyMTProvider

# Provider Registry
PROVIDERS = {
    "dummy": DummyMTProvider,
    # "openai": OpenAIMTProvider,
    # "deepl": DeepLMTProvider,
}

def get_provider(name: str, **kwargs) -> MTProvider:
    if name not in PROVIDERS:
        raise ValueError(f"Provider {name} not found")
    return PROVIDERS[name](**kwargs)
