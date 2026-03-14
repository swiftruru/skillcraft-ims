import { getDb } from '../index'
import type { Supplier, SupplierCreate } from '../schema'

export const SupplierModel = {
  findAll(search?: string): Supplier[] {
    const db = getDb()
    if (search) {
      return db
        .prepare('SELECT * FROM suppliers WHERE name LIKE ? OR contact LIKE ? ORDER BY name')
        .all(`%${search}%`, `%${search}%`) as Supplier[]
    }
    return db.prepare('SELECT * FROM suppliers ORDER BY name').all() as Supplier[]
  },

  findById(id: number): Supplier | null {
    return (getDb().prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier) ?? null
  },

  create(data: SupplierCreate): Supplier {
    const db = getDb()
    const result = db
      .prepare(
        `INSERT INTO suppliers (name, contact, phone, email, address, notes, credit_limit)
         VALUES (@name, @contact, @phone, @email, @address, @notes, @credit_limit)`
      )
      .run({ ...data, credit_limit: data.credit_limit ?? 0 })
    return this.findById(result.lastInsertRowid as number)!
  },

  update(id: number, data: Partial<SupplierCreate>): Supplier | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) return null
    const updated = { ...existing, ...data }
    db.prepare(
      `UPDATE suppliers SET name=@name, contact=@contact, phone=@phone, email=@email, address=@address, notes=@notes, credit_limit=@credit_limit WHERE id=@id`
    ).run({ ...updated, id })
    return this.findById(id)
  },

  delete(id: number): boolean {
    return getDb().prepare('DELETE FROM suppliers WHERE id = ?').run(id).changes > 0
  }
}
