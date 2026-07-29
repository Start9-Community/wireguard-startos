BEGIN {
  schema = "# wg-stats-v2"

  if ((getline header < state_file) > 0) {
    count = split(header, metadata, "\t")
    if (count >= 4 && metadata[1] == schema) {
      previous_day = metadata[2]
      previous_week = metadata[3]
      previous_month = metadata[4]

      while ((getline line < state_file) > 0) {
        count = split(line, fields, "\t")
        if (count >= 12) {
          key = fields[1]
          known[key] = 1
          total_received[key] = fields[3] + 0
          total_sent[key] = fields[4] + 0
          daily_received[key] = fields[5] + 0
          daily_sent[key] = fields[6] + 0
          weekly_received[key] = fields[7] + 0
          weekly_sent[key] = fields[8] + 0
          monthly_received[key] = fields[9] + 0
          monthly_sent[key] = fields[10] + 0
          previous_received[key] = fields[11] + 0
          previous_sent[key] = fields[12] + 0
        }
      }
    }
    close(state_file)
  }

  print schema "\t" day "\t" week "\t" month
}

NR == 1 {
  next
}

{
  key = $1
  handshake = $5 + 0
  received = $6 + 0
  sent = $7 + 0

  if (key in known) {
    received_delta = received >= previous_received[key] \
      ? received - previous_received[key] \
      : received
    sent_delta = sent >= previous_sent[key] \
      ? sent - previous_sent[key] \
      : sent

    total_received[key] += received_delta
    total_sent[key] += sent_delta

    daily_received[key] = (previous_day == day ? daily_received[key] : 0) + received_delta
    daily_sent[key] = (previous_day == day ? daily_sent[key] : 0) + sent_delta
    weekly_received[key] = (previous_week == week ? weekly_received[key] : 0) + received_delta
    weekly_sent[key] = (previous_week == week ? weekly_sent[key] : 0) + sent_delta
    monthly_received[key] = (previous_month == month ? monthly_received[key] : 0) + received_delta
    monthly_sent[key] = (previous_month == month ? monthly_sent[key] : 0) + sent_delta
  } else {
    total_received[key] = received
    total_sent[key] = sent
    daily_received[key] = 0
    daily_sent[key] = 0
    weekly_received[key] = 0
    weekly_sent[key] = 0
    monthly_received[key] = 0
    monthly_sent[key] = 0
  }

  printf "%s\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\t%.0f\n", \
    key, \
    handshake, \
    total_received[key], \
    total_sent[key], \
    daily_received[key], \
    daily_sent[key], \
    weekly_received[key], \
    weekly_sent[key], \
    monthly_received[key], \
    monthly_sent[key], \
    received, \
    sent
}
