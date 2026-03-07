import { getDb } from '../index'
import type { Customer, CustomerCreate } from '../schema'

export const CustomerModel = {
  findAll(search?: string): Customer[] {
    const db = getDb()
    if (search) {
      return db
        .prepare('SELECT * FROM customers WHERE name LIKE ? OR contact LIKE ? ORDER BY name')
        .all(`%${search}%`, `%${search}%`) as Customer[]
    }
    return db.prepare('SELECT * FROM customers ORDER BY name').all() as Customer[]
  },

  findById(id: number): Customer | null {
    return (getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer) ?? null
  },

  create(data: CustomerCreate): Customer {
    const db = getDb()
    const result = db
      .prepare(
        `INSERT INTO customers (name, contact, phone, email, address, notes)
         VALUES (@name, @contact, @phone, @email, @address, @notes)`
      )
      .run(data)
    return this.findById(result.lastInsertRowid as number)!
  },

  update(id: number, data: Partial<CustomerCreate>): Customer | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) return null
    const updated = { ...existing, ...data }
    db.prepare(
      `UPDATE customers SET name=@name, contact=@contact, phone=@phone, email=@email, address=@address, notes=@notes WHERE id=@id`
    ).run({ ...updated, id })
    return this.findById(id)
  },

  delete(id: number): boolean {
    return getDb().prepare('DELETE FROM customers WHERE id = ?').run(id).changes > 0
  }
}
