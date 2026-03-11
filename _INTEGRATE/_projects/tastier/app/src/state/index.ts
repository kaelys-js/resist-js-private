const state = global: {
    locale
    theme
    darkMode
},
search: {
    history
},
home: {
    empty,
    explore[]
},
discover: {
    empty,
    tags[],
    trending[]
    popular[]
    by_ingredient[]
},
pantry: {
    ingredients: {
        empty,
        list,
        detail: {
            open,
            id
        }
    },
    equipment: {
        empty,
        list,
        detail: {
            open
            id
        }
    }
},
meal_plan: {
    empty,
    list,
    groceries: {
        empty,
        list[]
    }
},
recipe: {
    open,
    id,
    is_favorite,
},
start_cooking: {
    open,
    recipe_id,
    timers[],
    paused,
    step
}
profile: {
    last tab/modal/etc
    region
    favorites[]
    cooked[]
    notifications: {
    },
    units
    how many people do you usually cook for
    dinners per week
    budget
    availableTime
    skillLevel
    dietaryPreferences
    allergies
    cuisines
    likes
    dislikes
    equipment
    pantry
    variety
    autoPlan
    autoPlanDay
}