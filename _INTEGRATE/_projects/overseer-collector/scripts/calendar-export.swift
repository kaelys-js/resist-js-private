#!/usr/bin/env swift

import EventKit
import Foundation

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)

// Request calendar access
store.requestFullAccessToEvents { granted, error in
    defer { semaphore.signal() }

    if !granted {
        fputs("Error: Calendar access not granted\n", stderr)
        exit(1)
    }

    // Parse arguments for date range (default: 30 days)
    let args = CommandLine.arguments
    let daysAhead = args.count > 1 ? Int(args[1]) ?? 30 : 30

    let startDate = Calendar.current.startOfDay(for: Date())
    guard let endDate = Calendar.current.date(byAdding: .day, value: daysAhead, to: startDate) else {
        fputs("Error: Could not calculate end date\n", stderr)
        exit(1)
    }

    // Get all calendars
    let calendars = store.calendars(for: .event)

    // Get events in date range
    let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
    let events = store.events(matching: predicate)

    // Output in pipe-delimited format: TITLE|START_EPOCH|END_EPOCH|ALLDAY|CALENDAR|LOCATION|NOTES|RECURRENCE
    for event in events {
        let startEpoch = Int(event.startDate.timeIntervalSince1970)
        let endEpoch = Int(event.endDate.timeIntervalSince1970)
        let isAllDay = event.isAllDay ? "true" : "false"
        let title = event.title?.replacingOccurrences(of: "|", with: "-") ?? "Untitled"
        let calendar = event.calendar?.title.replacingOccurrences(of: "|", with: "-") ?? "Unknown"
        let location = event.location?.replacingOccurrences(of: "|", with: "-").replacingOccurrences(of: "\n", with: " ") ?? ""
        let notes = event.notes?.replacingOccurrences(of: "|", with: "-").replacingOccurrences(of: "\n", with: " ").prefix(500) ?? ""
        let hasRecurrence = event.hasRecurrenceRules ? "recurring" : ""

        print("\(title)|\(startEpoch)|\(endEpoch)|\(isAllDay)|\(calendar)|\(location)|\(notes)|\(hasRecurrence)")
    }
}

semaphore.wait()
