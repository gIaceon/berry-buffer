//!native
/* eslint-disable no-case-declarations */
export type BuilderDatatypes = keyof typeof DatatypeLengths;
export type BuilderDeserDataTypes<T extends BuilderDatatypes> = DeserDataTypes[T];
export type BuilderStepsToDataTypes<T extends BuilderDatatypes[]> = { [i in keyof T]: BuilderDeserDataTypes<T[i]> };
interface BuilderStep<T extends BuilderDatatypes, K = BuilderDeserDataTypes<T>> {
	type: T;
	deser: (buf: buffer, offset: number, len: number) => K;
	ser: (buf: buffer, offset: number, len: number, data: K) => void;
}

const DatatypeLengths = {
	string: 0, // special, u32 + len of string (read from the u32)
	array: 0, // special, u32 len + (str data + u32 len)[]
	boolean: 1,
	i8: 1,
	u8: 1,
	i16: 2,
	u16: 2,
	i32: 4,
	u32: 4,
	f32: 4,
	f64: 8,
	vec3_32: 12,
	vec3_64: 24,
	color3: 3, // 3 u8s
	cframe_32: 24, // 2 vec3_32
	cframe_64: 24 + 12, // 1 vec3_64, 1 vec3_32
} as const;

interface DeserDataTypes {
	string: string;
	array: string[];
	boolean: boolean;
	i8: number;
	u8: number;
	i16: number;
	u16: number;
	i32: number;
	u32: number;
	f32: number;
	f64: number;
	vec3_32: Vector3;
	vec3_64: Vector3;
	color3: Color3;
	cframe_32: CFrame;
	cframe_64: CFrame;
}

const sharedSteps = {
	string: {
		type: "string",
		deser: (buf, offset, _) => {
			const strLength = buffer.readu32(buf, offset);
			if (strLength === 0) return "";
			return buffer.readstring(buf, offset + DatatypeLengths.u32, strLength);
		},
		ser: (buf, offset, _, data) => {
			const strData = tostring(data);
			const strLength = buffer.len(buffer.fromstring(strData));
			buffer.writeu32(buf, offset, strLength);
			buffer.writestring(buf, offset + DatatypeLengths.u32, strData);
		},
	},
	boolean: {
		type: "boolean",
		deser: (buf, offset, len) =>
			buffer.readstring(buf, offset, len) === string.char(1)
				? true
				: buffer.readstring(buf, offset, len) === string.char(0)
					? false
					: (() => {
							warn(`Buffer attempted to read boolean but found invalid character; treating as falsy`);
							return false;
						})(),
		ser: (buf, offset, len, data) =>
			buffer.writestring(buf, offset, data === true ? string.char(1) : string.char(0), len),
	},
	i8: {
		type: "i8",
		deser: (buf, offset, len) => buffer.readi8(buf, offset),
		ser: (buf, offset, len, data) => buffer.writei8(buf, offset, tonumber(data) ?? 0),
	},
	u8: {
		type: "u8",
		deser: (buf, offset, len) => buffer.readu8(buf, offset),
		ser: (buf, offset, len, data) => buffer.writeu8(buf, offset, tonumber(data) ?? 0),
	},
	i16: {
		type: "i16",
		deser: (buf, offset, len) => buffer.readi16(buf, offset),
		ser: (buf, offset, len, data) => buffer.writei16(buf, offset, tonumber(data) ?? 0),
	},
	u16: {
		type: "u16",
		deser: (buf, offset, len) => buffer.readu16(buf, offset),
		ser: (buf, offset, len, data) => buffer.writeu16(buf, offset, tonumber(data) ?? 0),
	},
	i32: {
		type: "i32",
		deser: (buf, offset, len) => buffer.readi32(buf, offset),
		ser: (buf, offset, len, data) => buffer.writei32(buf, offset, tonumber(data) ?? 0),
	},
	u32: {
		type: "u32",
		deser: (buf, offset, len) => buffer.readu32(buf, offset),
		ser: (buf, offset, len, data) => buffer.writeu32(buf, offset, tonumber(data) ?? 0),
	},
	f32: {
		type: "f32",
		deser: (buf, offset, len) => buffer.readf32(buf, offset),
		ser: (buf, offset, len, data) => buffer.writef32(buf, offset, tonumber(data) ?? 0),
	},
	f64: {
		type: "f64",
		deser: (buf, offset, len) => buffer.readf64(buf, offset),
		ser: (buf, offset, len, data) => buffer.writef64(buf, offset, tonumber(data) ?? 0),
	},
	vec3_32: {
		type: "vec3_32",
		deser: (buf, offset, len) =>
			new Vector3(
				buffer.readf32(buf, offset),
				buffer.readf32(buf, offset + DatatypeLengths.f32),
				buffer.readf32(buf, offset + DatatypeLengths.f32 + DatatypeLengths.f32),
			),
		ser: (buf, offset, len, data) => {
			let vecData;
			if (typeIs(data, "Vector3")) vecData = data;
			else vecData = Vector3.zero;
			buffer.writef32(buf, offset, vecData.X);
			buffer.writef32(buf, offset + DatatypeLengths.f32, vecData.Y);
			buffer.writef32(buf, offset + DatatypeLengths.f32 + DatatypeLengths.f32, vecData.Z);
		},
	},
	vec3_64: {
		type: "vec3_64",
		deser: (buf, offset, len) =>
			new Vector3(
				buffer.readf64(buf, offset),
				buffer.readf64(buf, offset + DatatypeLengths.f64),
				buffer.readf64(buf, offset + DatatypeLengths.f64 + DatatypeLengths.f64),
			),
		ser: (buf, offset, len, data) => {
			let vecData;
			if (typeIs(data, "Vector3")) vecData = data;
			else vecData = Vector3.zero;
			buffer.writef64(buf, offset, vecData.X);
			buffer.writef64(buf, offset + DatatypeLengths.f64, vecData.Y);
			buffer.writef64(buf, offset + DatatypeLengths.f64 + DatatypeLengths.f64, vecData.Z);
		},
	},
	color3: {
		type: "color3",
		deser: (buf, offset, len) =>
			Color3.fromRGB(
				buffer.readu8(buf, offset),
				buffer.readu8(buf, offset + DatatypeLengths.u8),
				buffer.readu8(buf, offset + DatatypeLengths.u8 + DatatypeLengths.u8),
			),
		ser: (buf, offset, len, data) => {
			let vecData;
			if (typeIs(data, "Color3")) vecData = data;
			else vecData = Color3.fromRGB(0, 0, 0);
			buffer.writeu8(buf, offset, math.floor(vecData.R * 255));
			buffer.writeu8(buf, offset + DatatypeLengths.u8, math.floor(vecData.G * 255));
			buffer.writeu8(buf, offset + DatatypeLengths.u8 + DatatypeLengths.u8, math.floor(vecData.B * 255));
		},
	},
	array: {
		type: "array",
		deser: (buf, offset, len) => {
			const arraySize = buffer.readu16(buf, offset);
			let currOffset = DatatypeLengths.u16;
			const ret: string[] = [];
			for (const i of $range(0, arraySize - 1, 1)) {
				const deserMember = sharedSteps.string.deser(buf, currOffset + offset, 0);
				const size = BufferBuilder.determineSize(buf, "string", currOffset + offset);
				currOffset += size;
				ret.push(deserMember);
			}
			return ret;
		},
		ser: (buf, offset, len, data) => {
			if (!typeIs(data, "table")) return;
			const array = data as never as string[];
			const arrayLen = array.size();
			buffer.writeu16(buf, offset, arrayLen);
			let currOffset = DatatypeLengths.u16;
			for (const i of $range(0, arrayLen - 1, 1)) {
				sharedSteps.string.ser(buf, currOffset + offset, 0, array[i]);
				// just get the size of the string from the string itself.. prob should change this at some point lul
				const size = BufferBuilder.determineSize(buf, "string", currOffset + offset);
				currOffset += size;
			}
		},
	},
	cframe_32: {
		type: "cframe_32",
		deser: (buf, offset, len) => {
			const p: Vector3 = sharedSteps.vec3_32.deser(buf, offset, len);
			const r: Vector3 = sharedSteps.vec3_32.deser(buf, offset + DatatypeLengths.vec3_32, len);
			return new CFrame(p).mul(CFrame.Angles(r.X, r.Y, r.Z));
		},
		ser: (buf, offset, len, data) => {
			if (!typeIs(data, "CFrame")) throw "Invalid datatype, expected CFrame";
			sharedSteps.vec3_32.ser(buf, offset, len, data.Position);
			sharedSteps.vec3_32.ser(
				buf,
				offset + DatatypeLengths.vec3_32,
				len,
				new Vector3(...data.ToEulerAnglesXYZ()),
			);
		},
	},
	cframe_64: {
		type: "cframe_64",
		deser: (buf, offset, len) => {
			const p: Vector3 = sharedSteps.vec3_64.deser(buf, offset, len);
			const r: Vector3 = sharedSteps.vec3_32.deser(buf, offset + DatatypeLengths.vec3_64, len);
			return new CFrame(p).mul(CFrame.Angles(r.X, r.Y, r.Z));
		},
		ser: (buf, offset, len, data) => {
			if (!typeIs(data, "CFrame")) throw "Invalid datatype, expected CFrame";
			sharedSteps.vec3_64.ser(buf, offset, len, data.Position);
			sharedSteps.vec3_32.ser(
				buf,
				offset + DatatypeLengths.vec3_64,
				len,
				new Vector3(...data.ToEulerAnglesXYZ()),
			);
		},
	},
} as const satisfies { readonly [K in BuilderDatatypes]: BuilderStep<K, unknown> };

export class BufferBuilder<T extends BuilderDatatypes[]> {
	public definitions = new Array() as [BuilderDatatypes, number, BuilderDeserDataTypes<BuilderDatatypes>][];
	protected constructor() {}

	public string(data: string): BufferBuilder<[...T, "string"]> {
		this.definitions.push(["string", buffer.len(buffer.fromstring(data)) + DatatypeLengths.u32, data]);
		return this as never;
	}

	public boolean(data: boolean): BufferBuilder<[...T, "boolean"]> {
		this.definitions.push(["boolean", DatatypeLengths.boolean, data]);
		return this as never;
	}

	public i8(data: number): BufferBuilder<[...T, "i8"]> {
		this.definitions.push(["i8", DatatypeLengths.i8, data]);
		return this as never;
	}

	public u8(data: number): BufferBuilder<[...T, "u8"]> {
		this.definitions.push(["u8", DatatypeLengths.u8, data]);
		return this as never;
	}

	public i16(data: number): BufferBuilder<[...T, "i16"]> {
		this.definitions.push(["i16", DatatypeLengths.i16, data]);
		return this as never;
	}

	public u16(data: number): BufferBuilder<[...T, "u16"]> {
		this.definitions.push(["u16", DatatypeLengths.u16, data]);
		return this as never;
	}

	public i32(data: number): BufferBuilder<[...T, "i32"]> {
		this.definitions.push(["i32", DatatypeLengths.i32, data]);
		return this as never;
	}

	public u32(data: number): BufferBuilder<[...T, "u32"]> {
		this.definitions.push(["u32", DatatypeLengths.u32, data]);
		return this as never;
	}

	public f32(data: number): BufferBuilder<[...T, "f32"]> {
		this.definitions.push(["f32", DatatypeLengths.f32, data]);
		return this as never;
	}

	public f64(data: number): BufferBuilder<[...T, "f64"]> {
		this.definitions.push(["f64", DatatypeLengths.f64, data]);
		return this as never;
	}

	public vec3_32(data: Vector3): BufferBuilder<[...T, "vec3_32"]> {
		this.definitions.push(["vec3_32", DatatypeLengths.vec3_32, data]);
		return this as never;
	}

	public vec3_64(data: Vector3): BufferBuilder<[...T, "vec3_64"]> {
		this.definitions.push(["vec3_64", DatatypeLengths.vec3_64, data]);
		return this as never;
	}

	public cframe_32(data: CFrame): BufferBuilder<[...T, "cframe_32"]> {
		this.definitions.push(["cframe_32", DatatypeLengths.cframe_32, data]);
		return this as never;
	}

	public cframe_64(data: CFrame): BufferBuilder<[...T, "cframe_64"]> {
		this.definitions.push(["cframe_64", DatatypeLengths.cframe_64, data]);
		return this as never;
	}

	public color3(data: Color3): BufferBuilder<[...T, "color3"]> {
		this.definitions.push(["color3", DatatypeLengths.color3, data]);
		return this as never;
	}

	// You can use BufferBuilder.display to serialize buffers, you are responsible for decoding it
	public array(data: string[]): BufferBuilder<[...T, "array"]> {
		const members = data.size();
		if (members > 65535) throw "Too large to serialize!!";
		const fullSize = data
			.mapFiltered((v) => (typeIs(v, "string") ? v : undefined))
			.reduce((accum, curr) => accum + buffer.len(buffer.fromstring(curr)) + DatatypeLengths.u32, 0);
		this.definitions.push(["array", DatatypeLengths.u16 + fullSize, data]);
		return this as never;
	}

	public build(): [buffer, T] {
		const size = this.definitions.reduce((accum, val) => accum + val[1], 0);
		let offset = 0;
		const buf = buffer.create(size);
		this.definitions.forEach(([kind, size, data]) => {
			sharedSteps[kind].ser(buf, offset, size, data);
			offset += size;
		});
		return [buf, this.definitions.mapFiltered((v) => v[0]) as T];
	}

	public static create(): BufferBuilder<[]> {
		return new BufferBuilder();
	}

	public static tostring(buf: buffer) {
		return `Buffer (${buffer.len(buf)} B)`;
	}

	public static display(buf: buffer) {
		return buffer.readstring(buf, 0, buffer.len(buf));
	}

	public static sizeBytes(buf: buffer) {
		return buffer.len(buf);
	}

	public static sizeBytesStr(str: string) {
		return buffer.len(buffer.fromstring(str));
	}

	public static steps<T extends BuilderDatatypes[]>(buf: buffer, steps: T): BuilderStepsToDataTypes<T> {
		let offsetTotalSizeRead = 0;
		const totalSize = steps.reduce((accum, val) => {
			// strings have length encoded as u32 as well, supply it!
			const currSize = this.determineSize(buf, val, offsetTotalSizeRead);
			offsetTotalSizeRead += currSize;
			return accum + currSize;
		}, 0);
		let offset = 0;
		const accumData: BuilderStepsToDataTypes<T> = [] as unknown as BuilderStepsToDataTypes<T>;
		steps.forEach((kind) => {
			const size = this.determineSize(buf, kind, offset);
			const data = sharedSteps[kind].deser(buf, offset, size);
			offset += size;
			accumData.push(
				data as T extends [...infer I]
					? I extends BuilderDatatypes
						? BuilderDeserDataTypes<I>
						: never
					: never,
			);
		});
		return accumData;
	}

	public static determineSize<T extends BuilderDatatypes>(buf: buffer, step: T, offset: number): number {
		let size = 0;
		switch (step) {
			case "string":
				size = sharedSteps.u32.deser(buf, offset, 0) + DatatypeLengths.u32;
				break;
			case "array":
				const arraySize = sharedSteps.u16.deser(buf, offset, 0);
				size = DatatypeLengths.u16;
				for (const i of $range(0, arraySize - 1, 1))
					size += BufferBuilder.determineSize(buf, "string", size + offset);
				break;
			default:
				size = DatatypeLengths[step];
				break;
		}
		return size;
	}
}
