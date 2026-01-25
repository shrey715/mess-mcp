from typing import Optional, List, Any
from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated

# Helper to handle ObjectId as string in Pydantic
PyObjectId = Annotated[str, BeforeValidator(str)]

class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    mmsId: Optional[str] = None
    authKey: Optional[str] = None
    attribute_bits: Optional[int] = None
    groupId: Optional[PyObjectId] = None

class UserInDB(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

class GroupBase(BaseModel):
    name: str
    code: str
    members: List[PyObjectId] = []
    admins: List[PyObjectId] = []

class GroupInDB(GroupBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

class AutoRegistrationInDB(BaseModel):
    userId: PyObjectId
    enabled: bool = False
    preferences: Optional[dict] = {}
    id: Optional[PyObjectId] = Field(alias="_id", default=None)


