namespace LifeOS.Domain.Garden

/// C# interop helpers for Garden domain value objects
[<AbstractClass; Sealed>]
type GardenInterop =
    static member GetAreaValue(area: Area) = 
        let (Area value) = area
        value
    
    static member GetDepthValue(depth: Depth) = 
        let (Depth value) = depth
        value
    
    static member GetPercentageValue(percentage: Percentage) = 
        let (Percentage value) = percentage
        value
    
    static member GetQuantityValue(quantity: Quantity) = 
        let (Quantity value) = quantity
        value

    static member GetMedicinalActionId(id: MedicinalActionId) =
        let (MedicinalActionId value) = id
        value

    static member GetConstituentId(id: ConstituentId) =
        let (ConstituentId value) = id
        value
